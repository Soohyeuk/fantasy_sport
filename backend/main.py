from flask import Flask, request, jsonify, redirect, url_for, session
from flask_cors import CORS, cross_origin
import pymysql
import jwt
import datetime
from flask import g
from werkzeug.security import generate_password_hash, check_password_hash
import ignore
from functools import wraps
from flask_jwt_extended import jwt_required, get_jwt_identity

########################################
#config starts 
########################################
app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"], supports_credentials=True)

db_config = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "",
    "database": "fsport",
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor
}

JWT_SECRET = ignore.JWT_SECRET_KEY
JWT_REFRESH_SECRET = ignore.JWT_REFRESH_SECRET_KEY
JWT_ALGORITHM = "HS256"

def token_required(f):
    def wrapper(*args, **kwargs):
        if request.method == "OPTIONS":
            response = jsonify({"message": "Preflight request successful"})
            response.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
            response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
            response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
            response.headers.add("Access-Control-Allow-Credentials", "true")
            return response, 200

        token = request.headers.get("Authorization")
        print("Token from header:", token)
        if not token:
            return jsonify({"error": "Token is missing"}), 401

        try:
            if token.startswith("Bearer "):
                token = token[7:] 

            decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            g.user = decoded
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)
    return wrapper

def requires_role(*roles):
    def wrapper(func):
        @wraps(func)
        def decorated_function(*args, **kwargs):
            if request.method == "OPTIONS":
                return jsonify({"message": "Preflight request successful"}), 200

            token = request.headers.get("Authorization")
            if not token:
                return jsonify({"error": "Authorization token is missing"}), 401

            try:
                if token.startswith("Bearer "):
                    token = token[7:]

                decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                g.user = decoded

                user_role = g.user.get("role")
                if user_role is None:
                    return jsonify({"error": "User role is missing in token"}), 403
                if user_role not in roles:
                    return jsonify({"error": "Insufficient permissions"}), 403

            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token expired"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Invalid token"}), 401
            except Exception as e:
                return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

            return func(*args, **kwargs)
        return decorated_function
    return wrapper

########################################
#config ends 
########################################


########################################
#login related routes starts 
########################################
@app.route('/login/', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        response = jsonify({"message": "Preflight request successful"})
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response, 200

    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        db = pymysql.connect(**db_config)
        with db.cursor() as cursor:
            query = "SELECT * FROM Users WHERE Username = %s AND Password = %s"
            cursor.execute(query, (username, password))
            user = cursor.fetchone()

        # if user and check_password_hash(user["Password"], password):
        if user:
            # generating jwt-token 
            access_token = jwt.encode(
                {
                    "user_id": user["User_ID"], 
                    "username": user["Username"],
                    "role": user["Role"],
                    "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=15),  
                },
                JWT_SECRET,
                algorithm=JWT_ALGORITHM
            )

            refresh_token = jwt.encode(
                {
                    "user_id": user["User_ID"],
                    "username": user["Username"],
                    "role": user["Role"],
                    "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7),
                },
                JWT_REFRESH_SECRET,
                algorithm=JWT_ALGORITHM
            )

            return jsonify({
                "access": access_token,
                "refresh": refresh_token,
                "message": "Login successful",
            }), 200
        else:
            return jsonify({"error": "Invalid username or password"}), 401

    except pymysql.MySQLError as e:
        print("Database error:", e)
        return jsonify({"error": "Database connection error"}), 500
    except Exception as e:
        print("Server error:", e)
        return jsonify({"error": "An error occurred"}), 500
    finally:
        if 'db' in locals():
            db.close()

@app.route('/refresh/', methods=['POST', 'OPTIONS'])
def refresh():
    if request.method == 'OPTIONS':
        response = jsonify({"message": "Preflight request successful"})
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response, 200
    try:
        data = request.get_json()
        refresh_token = data.get("refresh")

        if not refresh_token:
            return jsonify({"error": "Refresh token required"}), 400

        decoded = jwt.decode(refresh_token, JWT_REFRESH_SECRET, algorithms=[JWT_ALGORITHM])
        new_access_token = jwt.encode(
            {
                "user_id": decoded["user_id"],
                "username": decoded["username"],
                "role": decoded["role"],
                "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=15),
            },
            JWT_SECRET,
            algorithm=JWT_ALGORITHM
        )

        return jsonify({"access": new_access_token}), 200

    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Refresh token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid refresh token"}), 401

@app.route('/signin/', methods=['POST'])
def signin():
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get("email")
        password = data.get('password')

        if not username or not password or not email:
            return jsonify({"error": "Username and password are required"}), 400

        hashed_password = generate_password_hash(password, method="pbkdf2")
        db = pymysql.connect(**db_config)
        with db.cursor() as cursor:
            #checking if user already exists
            query = "SELECT * FROM Users WHERE Username = %s OR email = %s"
            print(len(hashed_password))
            
            cursor.execute(query, (username, email))
            existing_user = cursor.fetchone()
            if existing_user:
                return jsonify({"error": "Username already exists"}), 400

            #if new, insert into the database
            insert_query = "INSERT INTO Users (Username, Email, Password) VALUES (%s, %s, %s)"
            cursor.execute(insert_query, (username, email, password))
            db.commit()

        return jsonify({"message": "User created successfully"}), 201

    except pymysql.MySQLError as e:
        print("Database error:", e)
        return jsonify({"error": "Database connection error"}), 500
    except Exception as e:
        print("Server error:", e)
        return jsonify({"error": "An error occurred"}), 500
    finally:
        if 'db' in locals():
            db.close()
########################################
#login related routes ends  
########################################


########################################
#leagues related starts
########################################
@app.route('/get_leagues', methods=['GET'])
@requires_role("admin", "user")
def get_leagues():
    try:
        page = request.args.get('page', 1, type=int) 
        per_page = request.args.get('per_page', 10, type=int)  
        sport = request.args.get('sport')
        offset = (page - 1) * per_page
        
        query = "SELECT * FROM leagues"
        params = []

        if sport:
            query += " WHERE sport = %s"
            params.append(sport)

        query += " LIMIT %s OFFSET %s"
        params.extend([per_page, offset])
        
        db = pymysql.connect(**db_config)
        cursor = db.cursor()  # No 'dictionary' argument here; instead use DictCursor
        cursor = db.cursor(pymysql.cursors.DictCursor)  # Use DictCursor for dict-like rows
        cursor.execute(query, tuple(params))
        leagues = cursor.fetchall()

        # Get total count of leagues for pagination
        count_query = "SELECT COUNT(*) FROM leagues"
        if sport:
            count_query += " WHERE sport = %s"
        cursor.execute(count_query, tuple([sport] if sport else []))
        total_leagues = cursor.fetchone()['COUNT(*)']
        
        cursor.close()
        db.close()

        # Calculate total pages
        total_pages = (total_leagues + per_page - 1) // per_page  # Ceiling division

        # Prepare the response
        response = {
            'leagues': leagues,
            'total': total_leagues,
            'pages': total_pages,
            'current_page': page,
            'per_page': per_page
        }
        
        return jsonify(response), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/post_leagues/", methods=['POST', 'OPTIONS'], endpoint="post_leagues_endpoint")
@token_required
@requires_role("admin", "user")
def post_leagues():
    if request.method == 'OPTIONS':
        response = jsonify({"message": "Preflight request successful"})
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization") 
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response, 200

    data = request.get_json()
    league_name = data.get('leagueName')
    league_type = data.get('leagueType')
    commissioner = data.get('userID')
    max_teams = data.get('maxTeams')
    draft_date = data.get('draftDate')
    sport = data.get('initializedSports')

    if not league_name or not league_type or not commissioner or not max_teams or not draft_date or not sport:
        print(sport)
        return jsonify({'message': 'Missing required fields'}), 400
    
    connection = pymysql.connect(**db_config)
    cursor = connection.cursor()

    try:
        insert_query = """
            INSERT INTO leagues (LeagueName, LeagueType, Commissioner, MaxTeams, DraftDate, Sport)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        cursor.execute(insert_query, (league_name, league_type, commissioner, max_teams, draft_date, sport))
        connection.commit()

        return jsonify({'message': 'League created successfully'}), 201
    except Exception as e:
        connection.rollback()
        print(f"Error occurred: {e}")
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        connection.close()



@app.route("/", methods=['GET'], endpoint="home_endpoint")
@token_required
@requires_role('admin')
def home():
    return jsonify(simple=12)

if __name__ == "__main__":
    app.run(debug=True)
