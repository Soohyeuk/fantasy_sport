import hashlib
from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
import jwt
from datetime import datetime, timedelta
from flask import g
import ignore
from functools import wraps

CLIENTADDRESS = "http://localhost:5173"
DATABASENAME = "fsport"

########################################
#config starts 
########################################
app = Flask(__name__)
CORS(app, origins=[CLIENTADDRESS], supports_credentials=True)

db_config = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "",
    "database": DATABASENAME,
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
            response.headers.add("Access-Control-Allow-Origin", CLIENTADDRESS)
            response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
            response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
            response.headers.add("Access-Control-Allow-Credentials", "true")
            return response, 200

        token = request.headers.get("Authorization")
        # print("Token from header:", token)
        if not token:
            return jsonify({"error": "Token is missing"}), 401

        try:
            if token.startswith("Bearer "):
                token = token[7:] 

            decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            g.user = decoded
        except jwt.ExpiredSignatureError:
            print("d")
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            print("e")
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)
    return wrapper

def requires_role(*roles):
    def wrapper(func):
        @wraps(func)
        def decorated_function(*args, **kwargs):
            if request.method == "OPTIONS":
                response = jsonify({"message": "Preflight request successful"})
                response.headers.add("Access-Control-Allow-Origin", CLIENTADDRESS)
                response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
                response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
                response.headers.add("Access-Control-Allow-Credentials", "true")
                return response, 200

            token = request.headers.get("Authorization")
            print(token)
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
        response.headers.add("Access-Control-Allow-Origin", CLIENTADDRESS)
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
            cursor.execute(query, (username, hashlib.sha256(password.encode()).hexdigest()))
            user = cursor.fetchone()

        # if user and check_password_hash(user["Password"], password):
        if user:
            # generating jwt-token 
            access_token = jwt.encode(
                {
                    "user_id": user["User_ID"], 
                    "username": user["Username"],
                    "role": user["Role"],
                    "exp": datetime.utcnow() + timedelta(minutes=15),  
                },
                JWT_SECRET,
                algorithm=JWT_ALGORITHM
            )

            refresh_token = jwt.encode(
                {
                    "user_id": user["User_ID"],
                    "username": user["Username"],
                    "role": user["Role"],
                    "exp": datetime.utcnow() + timedelta(days=7),
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
        response.headers.add("Access-Control-Allow-Origin", CLIENTADDRESS)
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response, 200

    try:
        data = request.get_json()
        refresh_token = data.get("refresh")
        print(refresh_token)
        if not refresh_token:
            print("ddd")
            return jsonify({"error": "Refresh token required"}), 400

        decoded = jwt.decode(refresh_token, JWT_REFRESH_SECRET, algorithms=[JWT_ALGORITHM], options={"verify_exp": False})

        if datetime.utcfromtimestamp(decoded['exp']) < datetime.utcnow():
            print("a")
            return jsonify({"error": "Refresh token expired"}), 401
        new_access_token = jwt.encode(
            {
                "user_id": decoded["user_id"],
                "username": decoded["username"],
                "role": decoded["role"],
                "exp": datetime.utcnow() + timedelta(minutes=15),
            },
            JWT_SECRET,
            algorithm=JWT_ALGORITHM
        )

        new_refresh_token = jwt.encode(
            {
                "user_id": decoded["user_id"],
                "username": decoded["username"],
                "role": decoded["role"],
                "exp": datetime.utcnow() + timedelta(days=7),
            },
            JWT_REFRESH_SECRET,
            algorithm=JWT_ALGORITHM
        )

        return jsonify({"access": new_access_token, "refresh": new_refresh_token}), 200

    except jwt.ExpiredSignatureError:
        print("b")
        return jsonify({"error": "Refresh token expired"}), 401
    except jwt.InvalidTokenError:
        print("c")
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

        hashed_password = hashlib.sha256(password.encode()).hexdigest()
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
            cursor.execute(insert_query, (username, email, hashed_password))
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
        cursor = db.cursor()  
        cursor = db.cursor(pymysql.cursors.DictCursor)
        cursor.execute(query, tuple(params))
        leagues = cursor.fetchall()

        count_query = "SELECT COUNT(*) FROM leagues"
        if sport:
            count_query += " WHERE sport = %s"
        cursor.execute(count_query, tuple([sport] if sport else []))
        total_leagues = cursor.fetchone()['COUNT(*)']
        
        cursor.close()
        db.close()

        total_pages = (total_leagues + per_page - 1) // per_page 
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
@requires_role("admin", "user")
def post_leagues():
    if request.method == 'OPTIONS':
        response = jsonify({"message": "Preflight request successful"})
        response.headers.add("Access-Control-Allow-Origin", CLIENTADDRESS)
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
        return jsonify({'message': 'Missing required fields'}), 400
    
    try:
        draft_date_parsed = datetime.strptime(draft_date, "%Y-%m-%dT%H:%M") 
        if draft_date_parsed <= datetime.utcnow() + timedelta(hours=1):
            print("nah")
            return jsonify({'message': 'Draft date must be at least one hour after the current UTC time'}), 400
    except ValueError:
        print("s")
        return jsonify({'message': 'Invalid draft date format. Please provide ISO 8601 format (e.g., YYYY-MM-DDTHH:MM:SS).'}), 400


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
########################################
#leagues related ends
########################################

########################################
#players related starts
########################################

@app.route('/get_players', methods=['GET'])
@requires_role("admin", "user")
def get_players():
    try:
        # Fetch query parameters
        page = request.args.get('page', 1, type=int)  # Default to page 1
        per_page = request.args.get('per_page', 10, type=int)  # Default to 10 players per page
        sport = request.args.get('sport')  # Optional filter by sport
        player_id = request.args.get('player_id')  # Optional filter by player ID
        offset = (page - 1) * per_page  # Calculate offset for pagination

        # Build base query
        query = "SELECT * FROM players"
        params = []

        # Apply filters if provided
        if sport or player_id:
            query += " WHERE"
            if sport:
                query += " sport = %s"
                params.append(sport)
            if player_id:
                if sport:
                    query += " AND"
                query += " Player_ID = %s"
                params.append(player_id)

        # Add pagination
        query += " LIMIT %s OFFSET %s"
        params.extend([per_page, offset])

        # Execute the query
        db = pymysql.connect(**db_config)
        cursor = db.cursor(pymysql.cursors.DictCursor)
        cursor.execute(query, tuple(params))
        players = cursor.fetchall()

        # Count total players for pagination
        count_query = "SELECT COUNT(*) as total FROM players"
        if sport or player_id:
            count_query += " WHERE"
            if sport:
                count_query += " sport = %s"
            if player_id:
                if sport:
                    count_query += " AND"
                count_query += " Player_ID = %s"
        cursor.execute(count_query, tuple([sport, player_id] if sport and player_id else [sport or player_id]))
        total_players = cursor.fetchone()['total']

        cursor.close()
        db.close()

        # Calculate total pages
        total_pages = (total_players + per_page - 1) // per_page

        # Prepare response
        response = {
            'players': players,
            'total': total_players,
            'pages': total_pages,
            'current_page': page,
            'per_page': per_page
        }

        return jsonify(response), 200
    except Exception as e:
        print(f"Error fetching players: {e}")
        return jsonify({"error": str(e)}), 400

########################################
#players related ends
########################################

########################################
#team related starts
########################################
@app.route('/get_teams', methods=['GET'])
@requires_role("admin", "user")
def get_teams():
    try:
        page = request.args.get('page', 1, type=int) 
        per_page = request.args.get('per_page', 10, type=int)  
        league_id = request.args.get('league_id') 
        offset = (page - 1) * per_page
        
        query = "SELECT * FROM teams"
        params = []

        if league_id:
            query += " WHERE league_id = %s"
            params.append(league_id)

        query += " LIMIT %s OFFSET %s"
        params.extend([per_page, offset])
        
        db = pymysql.connect(**db_config)
        cursor = db.cursor(pymysql.cursors.DictCursor)  
        cursor.execute(query, tuple(params))
        teams = cursor.fetchall()

        count_query = "SELECT COUNT(*) FROM teams"
        if league_id:
            count_query += " WHERE league_id = %s"
        cursor.execute(count_query, tuple([league_id] if league_id else []))
        total_teams = cursor.fetchone()['COUNT(*)']
        
        cursor.close()
        db.close()
        total_pages = (total_teams + per_page - 1) // per_page  

        response = {
            'teams': teams,
            'total': total_teams,
            'pages': total_pages,
            'current_page': page,
            'per_page': per_page
        }
        
        return jsonify(response), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/post_teams/", methods=['POST', 'OPTIONS'], endpoint="post_teams_endpoint")
@requires_role("admin", "user")
def post_teams():
    if request.method == 'OPTIONS':
        response = jsonify({"message": "Preflight request successful"})
        response.headers.add("Access-Control-Allow-Origin", CLIENTADDRESS)
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization") 
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response, 200

    data = request.get_json()
    team_name = data.get('teamName')
    owner = data.get('owner')
    league_id = data.get('leagueId')

    if not team_name or not league_id or not owner:
        return jsonify({'message': 'Missing required fields'}), 400

    connection = pymysql.connect(**db_config)
    cursor = connection.cursor()

    try:
        insert_query = """
            INSERT INTO teams (TeamName, Owner, League_ID)
            VALUES (%s, %s, %s)
        """
        cursor.execute(insert_query, (team_name, owner, league_id))
        connection.commit()

        return jsonify({'message': 'Team created successfully'}), 201
    except Exception as e:
        connection.rollback()
        print(f"Error occurred: {e}")
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        connection.close()
########################################
#team related ends
########################################
        


########################################
#match related starts
########################################
@app.route('/league/<int:league_id>/matches', methods=['GET'])
@requires_role("admin", "user")
def get_league_matches(league_id):
    try:
        page = request.args.get('page', 1, type=int)  
        per_page = request.args.get('per_page', 10, type=int) 
        offset = (page - 1) * per_page 

        db = pymysql.connect(**db_config)
        cursor = db.cursor(pymysql.cursors.DictCursor)

        query_teams = "SELECT Team_ID FROM teams WHERE League_ID = %s"
        cursor.execute(query_teams, (league_id,))
        teams = cursor.fetchall()
        team_ids = [team['Team_ID'] for team in teams]

        if not team_ids:
            return jsonify({"error": "No teams found in the league"}), 404
        
        placeholders = ','.join(['%s'] * len(team_ids))
        query_matches = f"""
            SELECT 
                m.Match_ID, 
                m.Team1_ID, 
                m.Team2_ID, 
                t1.TeamName AS Team1_Name,
                t2.TeamName AS Team2_Name,
                m.MatchDate, 
                m.FinalScore, 
                m.Winner
            FROM matches m
            JOIN Teams t1 ON m.Team1_ID = t1.Team_ID
            JOIN Teams t2 ON m.Team2_ID = t2.Team_ID
            WHERE m.Team1_ID IN ({placeholders}) OR m.Team2_ID IN ({placeholders})
            LIMIT %s OFFSET %s
        """
        params = team_ids + team_ids + [per_page, offset]
        cursor.execute(query_matches, params)
        matches = cursor.fetchall()

        count_query = f"""
            SELECT COUNT(*) as total FROM matches 
            WHERE Team1_ID IN ({placeholders}) OR Team2_ID IN ({placeholders})
        """
        cursor.execute(count_query, team_ids + team_ids)
        total_matches = cursor.fetchone()['total']

        cursor.close()
        db.close()

        total_pages = (total_matches + per_page - 1) // per_page

        response = {
            'matches': matches,
            'total': total_matches,
            'pages': total_pages,
            'current_page': page,
            'per_page': per_page
        }

        return jsonify(response), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
########################################
#match related ends
########################################


########################################
#profile setting related starts
########################################
@app.route('/update-profile', methods=['POST', 'OPTIONS'])
@requires_role("admin", "user")
def update_profile():
    if request.method == 'OPTIONS':
        response = jsonify({"message": "Preflight request successful"})
        response.headers.add("Access-Control-Allow-Origin", CLIENTADDRESS)
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization") 
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response, 200
    
    data = request.json

    user_id = data.get("user_id")
    username = data.get("username")
    password = data.get("password")
    email = data.get("email")
    first_name = data.get("first_name")
    last_name = data.get("last_name")

    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    try:
        # Connect to database
        connection = pymysql.connect(**db_config)
        cursor = connection.cursor()

        # Update the user data in the database
        sql = """
            UPDATE users 
            SET Username = %s, Password = %s, Email = %s, 
                FullName = CONCAT(%s, ' ', %s)
            WHERE User_ID = %s
        """
        cursor.execute(sql, (username, password, email, first_name, last_name, user_id))
        connection.commit()

        return jsonify({"message": "Profile updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        connection.close()
########################################
#profile setting related ends
########################################


@app.route("/", methods=['GET'], endpoint="home_endpoint")
@token_required
@requires_role('admin')
def home():
    return jsonify(simple=12)

if __name__ == "__main__":
    app.run(debug=True)
