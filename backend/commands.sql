-- Users Table
CREATE TABLE Users (
    User_ID INT AUTO_INCREMENT PRIMARY KEY,
    FullName VARCHAR(50),
    Email VARCHAR(50) UNIQUE NOT NULL,
    Username VARCHAR(20) UNIQUE NOT NULL,
    Password VARCHAR(64) NOT NULL,  -- assumed to be stored encrypted
    ProfileSettings JSON,  -- MySQL supports JSON directly
    Role ENUM('user', 'admin') DEFAULT 'user' NOT NULL
);

-- Leagues Table
CREATE TABLE Leagues (
    League_ID INT AUTO_INCREMENT PRIMARY KEY,
    LeagueName VARCHAR(30) NOT NULL,
    LeagueType CHAR(1) DEFAULT 'U' NOT NULL CHECK (LeagueType IN ('P', 'R')),  -- P for Public, R for Private
    Commissioner INT,
    MaxTeams INT NOT NULL DEFAULT 10,  
    DraftDate DATE,
    Sport CHAR(3) NOT NULL CHECK (Sport IN ('FTB', 'BB', 'SB')),
    FOREIGN KEY (Commissioner) REFERENCES Users(User_ID)
);

-- Teams Table
CREATE TABLE Teams (
    Team_ID INT AUTO_INCREMENT PRIMARY KEY,
    TeamName VARCHAR(25) NOT NULL,
    Owner INT,
    League_ID INT,
    TotalPoints NUMERIC(6, 2) DEFAULT 0.00,
    Ranking INT,
    Status CHAR(1) DEFAULT 'A' CHECK (Status IN ('A', 'I')),  
    FOREIGN KEY (Owner) REFERENCES Users(User_ID),
    FOREIGN KEY (League_ID) REFERENCES Leagues(League_ID)
);

-- Players Table
CREATE TABLE Players (
    Player_ID INT AUTO_INCREMENT PRIMARY KEY,
    FullName VARCHAR(50) NOT NULL,
    Sport CHAR(3) NOT NULL CHECK (Sport IN ('FTB', 'BB', 'SB')),  
    Position CHAR(3),  
    RealTeam VARCHAR(50),
    FantasyPoints NUMERIC(6, 2) DEFAULT 0.00,
    AvailabilityStatus CHAR(1) DEFAULT 'A' CHECK (AvailabilityStatus IN ('A', 'U'))  
);

CREATE TABLE PlayersTeams (
    Player_ID INT NOT NULL,                      
    Team_ID INT NOT NULL,                        
    League_ID INT,                      
    PRIMARY KEY (Player_ID, Team_ID),           
    FOREIGN KEY (Player_ID) REFERENCES Players(Player_ID) ON DELETE CASCADE,
    FOREIGN KEY (Team_ID) REFERENCES Teams(Team_ID) ON DELETE CASCADE,
    FOREIGN KEY (League_ID) REFERENCES Leagues(League_ID) ON DELETE CASCADE                  
);

-- Drafts Table
CREATE TABLE Drafts (
    Draft_ID INT AUTO_INCREMENT PRIMARY KEY,
    League_ID INT,
    DraftDate DATE,
    DraftOrder CHAR(1) CHECK (DraftOrder IN ('R', 'S')),
    DraftStatus CHAR(1) DEFAULT 'I' CHECK (DraftStatus IN ('I', 'C')),  -- R for Round-Robin, S for Snake
    FOREIGN KEY (League_ID) REFERENCES Leagues(League_ID)
);

-- Matches Table
CREATE TABLE Matches (
    Match_ID INT AUTO_INCREMENT PRIMARY KEY,
    Team1_ID INT,
    Team2_ID INT,
    MatchDate DATE,
    FinalScore VARCHAR(10),  -- e.g., "75-68"
    Winner INT,
    FOREIGN KEY (Team1_ID) REFERENCES Teams(Team_ID),
    FOREIGN KEY (Team2_ID) REFERENCES Teams(Team_ID),
    FOREIGN KEY (Winner) REFERENCES Teams(Team_ID)
);

-- PlayerStatistics Table
CREATE TABLE PlayerStatistics (
    Stat_ID INT AUTO_INCREMENT PRIMARY KEY,
    Player_ID INT,
    GameDate DATE,
    PerformanceStat JSON,  -- MySQL supports JSON directly
    InjuryStatus CHAR(1) DEFAULT 'N' CHECK (InjuryStatus IN ('Y', 'N')),  -- Y for Yes, N for No
    FOREIGN KEY (Player_ID) REFERENCES Players(Player_ID)
);

-- Trades Table
CREATE TABLE Trades (
    Trade_ID INT AUTO_INCREMENT PRIMARY KEY,
    Team1_ID INT,
    Team2_ID INT,
    TradedPlayer1_ID INT,
    TradedPlayer2_ID INT,
    TradeDate DATE,
    FOREIGN KEY (Team1_ID) REFERENCES Teams(Team_ID),
    FOREIGN KEY (Team2_ID) REFERENCES Teams(Team_ID),
    FOREIGN KEY (TradedPlayer1_ID) REFERENCES Players(Player_ID),
    FOREIGN KEY (TradedPlayer2_ID) REFERENCES Players(Player_ID)
);

-- Waivers Table
CREATE TABLE Waivers (
    Waiver_ID INT AUTO_INCREMENT PRIMARY KEY,
    Team_ID INT,
    Player_ID INT,
    WaiverOrder INT,
    WaiverStatus CHAR(1) DEFAULT 'P' CHECK (WaiverStatus IN ('P', 'A')),  -- P for Pending, A for Approved
    WaiverPickupDate DATE,
    FOREIGN KEY (Team_ID) REFERENCES Teams(Team_ID),
    FOREIGN KEY (Player_ID) REFERENCES Players(Player_ID)
);

-- TRIGGERS
-- TRIGGER TO SET LEAGUE ID
DELIMITER $$

CREATE TRIGGER SetLeagueID
BEFORE INSERT ON PlayersTeams
FOR EACH ROW
BEGIN
    DECLARE teamLeagueID INT;

    -- Get the league ID for the given team ID
    SELECT League_ID INTO teamLeagueID
    FROM Teams
    WHERE Team_ID = NEW.Team_ID;

    -- Assign the League_ID to the new row
    SET NEW.League_ID = teamLeagueID;
END$$

DELIMITER ;

-- COMMANDS
-- Make sure a team cannot face itself
ALTER TABLE Matches ADD CONSTRAINT check_match_valid CHECK (Team1_ID <> Team2_ID);

-- Update team points when engaging in a player trade
DELIMITER @@
CREATE OR REPLACE TRIGGER updateTeam
AFTER INSERT ON Trades
FOR EACH ROW
BEGIN
    IF new.Team1_ID IS NOT NULL THEN
        UPDATE Teams
        SET TotalPoints = TotalPoints 
                            + (SELECT FantasyPoints FROM Players WHERE Player_ID = new.TradedPlayer2_ID) 
                            - (SELECT FantasyPoints FROM Players WHERE Player_ID = new.TradedPlayer1_ID)
        WHERE Team_ID = new.Team1_ID;
    END IF;
    IF new.Team2_ID IS NOT NULL THEN
        UPDATE Teams
        SET TotalPoints = TotalPoints 
                            + (SELECT FantasyPoints FROM Players WHERE Player_ID = new.TradedPlayer2_ID) 
                            - (SELECT FantasyPoints FROM Players WHERE Player_ID = new.TradedPlayer1_ID)
        WHERE Team_ID = new.Team2_ID;
    END IF;
END @@
DELIMITER ;

DELIMITER $$

CREATE PROCEDURE UpdateTeamRankings(IN league_id INT)
BEGIN
    DECLARE rank INT DEFAULT 1;

    -- Use a cursor to iterate over teams in the league ordered by TotalPoints DESC
    DECLARE finished INT DEFAULT 0;
    DECLARE team_id INT;

    -- Cursor for selecting team IDs in the specified league
    DECLARE team_cursor CURSOR FOR
        SELECT Team_ID FROM Teams WHERE League_ID = league_id ORDER BY TotalPoints DESC;

    -- Handler to detect the end of the cursor
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET finished = 1;

    OPEN team_cursor;

    ranking_loop: LOOP
        FETCH team_cursor INTO team_id;

        IF finished = 1 THEN
            LEAVE ranking_loop;
        END IF;

        -- Update the ranking of the current team
        UPDATE Teams SET Ranking = rank WHERE Team_ID = team_id;

        SET rank = rank + 1;
    END LOOP;

    CLOSE team_cursor;
END$$

DELIMITER ;
	
-- Update team points when inserting into PlayersTeams
DELIMITER @@
CREATE OR REPLACE TRIGGER addPlayerStrength
AFTER INSERT ON PlayersTeams
FOR EACH ROW
BEGIN
    IF new.Team_ID IS NOT NULL THEN
	UPDATE Teams
	SET TotalPoints = TotalPoints 
			    + (SELECT FantasyPoints FROM Players WHERE Players.Player_ID = new.Player_ID)
	WHERE Teams.Team_ID = new.Team_ID;
    END IF;
END @@
DELIMITER ;

-- Remove team points when deleting from PlayersTeams
DELIMITER @@
CREATE OR REPLACE TRIGGER removePlayerStrength
AFTER DELETE ON PlayersTeams
FOR EACH ROW
BEGIN
    IF old.Team_ID IS NOT NULL THEN
	UPDATE Teams
	SET TotalPoints = TotalPoints 
			    - (SELECT FantasyPoints FROM Players WHERE Players.Player_ID = old.Player_ID)
	WHERE Teams.Team_ID = old.Team_ID;
    END IF;
END @@
DELIMITER ;

-- Update team ranking upon inserting into PlayersTeams
DELIMITER $$

CREATE TRIGGER RecalculateTeamRankingOnInsert
AFTER INSERT ON PlayersTeams
FOR EACH ROW
BEGIN
    -- Update the ranking of all teams in the league based on TotalPoints
    UPDATE Teams AS T1
    JOIN (
        SELECT 
            Team_ID,
            RANK() OVER (PARTITION BY League_ID ORDER BY TotalPoints DESC) AS new_ranking
        FROM Teams
    ) AS Rankings
    ON T1.Team_ID = Rankings.Team_ID
    SET T1.Ranking = Rankings.new_ranking;
END$$

DELIMITER ;

-- Update team ranking upon deleting from PlayersTeams
DELIMITER $$

CREATE TRIGGER RecalculateTeamRankingOnDelete
AFTER DELETE ON PlayersTeams
FOR EACH ROW
BEGIN
    -- Update the ranking of all teams in the league based on TotalPoints
    UPDATE Teams AS T1
    JOIN (
        SELECT 
            Team_ID,
            RANK() OVER (PARTITION BY League_ID ORDER BY TotalPoints DESC) AS new_ranking
        FROM Teams
    ) AS Rankings
    ON T1.Team_ID = Rankings.Team_ID
    SET T1.Ranking = Rankings.new_ranking;
END$$

DELIMITER ;
-- USERS INSERTS
INSERT INTO Users (FullName, Email, Username, Password, ProfileSettings)
VALUES ('John Doe', 'johndoe@example.com', 'johndoe', 'encryptedpassword', '{"theme": "dark", "notifications": true}');

INSERT INTO Users (FullName, Email, Username, Password, ProfileSettings)
VALUES ('Jane Doe', 'janedoe@example.com', 'janedoe', 'encryptedpassword123', '{"theme": "light", "notifications": false}');

INSERT INTO Users (FullName, Email, Username, Password, ProfileSettings)
VALUES ('Minji Kim', 'minjikim@example.com', 'minji', 'password1234', '{"theme": "dark", "notifications": false}');

INSERT INTO Users (FullName, Email, Username, Password, ProfileSettings)
VALUES ('Hanni Pham', 'hannipham@example.com', 'hanni', 'securepass456', '{"theme": "light", "notifications": true}');

INSERT INTO Users (FullName, Email, Username, Password, ProfileSettings)
VALUES ('Danielle Marsh', 'daniellem@example.com', 'danielle', 'mypassword789', '{"theme": "dark", "notifications": true}');

INSERT INTO Users (FullName, Email, Username, Password, ProfileSettings)
VALUES ('Haerin Kang', 'haerinkang@example.com', 'haerin', 'whitesecurepwd', '{"theme": "light", "notifications": true}');

INSERT INTO Users (FullName, Email, Username, Password, ProfileSettings)
VALUES ('Hyein Lee', 'hyeinlee@example.com', 'hyein', 'hyeinpass567', '{"theme": "dark", "notifications": false}');

INSERT INTO Users (FullName, Email, Username, Password, ProfileSettings)
VALUES ('Lan Nguyen', 'lannguyen@example.com', 'lan', 'password1010', '{"theme": "light", "notifications": true}');

INSERT INTO Users (FullName, Email, Username, Password, ProfileSettings)
VALUES ('Phuong Tran', 'phuongtran@example.com', 'phuong', 'superpass999', '{"theme": "dark", "notifications": false}');

INSERT INTO Users (FullName, Email, Username, Password, ProfileSettings)
VALUES ('Hung Le', 'hungle@example.com', 'hung', 'mypwd777', '{"theme": "light", "notifications": true}');

-- LEAGUES INSERTS
INSERT INTO Leagues (LeagueName, LeagueType, Commissioner, MaxTeams, DraftDate, Sport)
VALUES ('Champions League', 'P', 1, 12, '2024-12-01', 'FTB');

INSERT INTO Leagues (LeagueName, LeagueType, Commissioner, MaxTeams, DraftDate, Sport)
VALUES ('Red League', 'R', 2, 10, '2024-12-05', 'FTB');

INSERT INTO Leagues (LeagueName, LeagueType, Commissioner, MaxTeams, DraftDate, Sport)
VALUES ('Blue League', 'P', 3, 16, '2024-12-10', 'FTB');

INSERT INTO Leagues (LeagueName, LeagueType, Commissioner, MaxTeams, DraftDate, Sport)
VALUES ('Green League', 'R', 4, 8, '2024-12-15', 'FTB');

INSERT INTO Leagues (LeagueName, LeagueType, Commissioner, MaxTeams, DraftDate, Sport)
VALUES ('Yellow League', 'P', 5, 12, '2024-12-20', 'FTB');

INSERT INTO Leagues (LeagueName, LeagueType, Commissioner, MaxTeams, DraftDate, Sport)
VALUES ('Purple League', 'R', 6, 14, '2024-12-25', 'FTB');

INSERT INTO Leagues (LeagueName, LeagueType, Commissioner, MaxTeams, DraftDate, Sport)
VALUES ('Orange League', 'P', 7, 10, '2024-12-30', 'FTB');

INSERT INTO Leagues (LeagueName, LeagueType, Commissioner, MaxTeams, DraftDate, Sport)
VALUES ('Black League', 'R', 8, 12, '2025-01-05', 'FTB');

INSERT INTO Leagues (LeagueName, LeagueType, Commissioner, MaxTeams, DraftDate, Sport)
VALUES ('White League', 'P', 9, 16, '2025-01-10', 'FTB');

INSERT INTO Leagues (LeagueName, LeagueType, Commissioner, MaxTeams, DraftDate, Sport)
VALUES ('Silver League', 'R', 10, 10, '2025-01-15', 'FTB');

-- TEAMS INSERTS
INSERT INTO Teams (TeamName, Owner, League_ID, TotalPoints, Ranking, Status)
VALUES ('Eagles', 1, 1, 150.50, 1, 'A');

INSERT INTO Teams (TeamName, Owner, League_ID, TotalPoints, Ranking, Status)
VALUES ('Warriors', 2, 1, 110.50, 3, 'A');

INSERT INTO Teams (TeamName, Owner, League_ID, TotalPoints, Ranking, Status)
VALUES ('T1 Titans', 3, 2, 125.75, 2, 'A');

INSERT INTO Teams (TeamName, Owner, League_ID, TotalPoints, Ranking, Status)
VALUES ('Sentinels Shield', 4, 2, 102.30, 4, 'A');

INSERT INTO Teams (TeamName, Owner, League_ID, TotalPoints, Ranking, Status)
VALUES ('100Thieves Heist', 5, 3, 98.40, 5, 'A');

INSERT INTO Teams (TeamName, Owner, League_ID, TotalPoints, Ranking, Status)
VALUES ('Flyquest Falcons', 6, 3, 130.25, 1, 'A');

INSERT INTO Teams (TeamName, Owner, League_ID, TotalPoints, Ranking, Status)
VALUES ('GenG Tigers', 7, 4, 115.60, 3, 'A');

INSERT INTO Teams (TeamName, Owner, League_ID, TotalPoints, Ranking, Status)
VALUES ('Cloud9 Storm', 8, 4, 122.45, 2, 'A');

INSERT INTO Teams (TeamName, Owner, League_ID, TotalPoints, Ranking, Status)
VALUES ('FaZe Fury', 9, 5, 105.30, 4, 'A');

INSERT INTO Teams (TeamName, Owner, League_ID, TotalPoints, Ranking, Status)
VALUES ('NRG Surge', 10, 5, 109.80, 5, 'A');

-- MATCHES INSERTS
INSERT INTO Matches (Team1_ID, Team2_ID, MatchDate, FinalScore, Winner)
VALUES (1, 2, '2024-12-15', '75-68', 1);

INSERT INTO Matches (Team1_ID, Team2_ID, MatchDate, FinalScore, Winner)
VALUES (3, 4, '2024-12-16', '80-72', 3);

INSERT INTO Matches (Team1_ID, Team2_ID, MatchDate, FinalScore, Winner)
VALUES (5, 6, '2024-12-17', '67-60', 5);

INSERT INTO Matches (Team1_ID, Team2_ID, MatchDate, FinalScore, Winner)
VALUES (7, 8, '2024-12-18', '90-85', 7);

INSERT INTO Matches (Team1_ID, Team2_ID, MatchDate, FinalScore, Winner)
VALUES (9, 10, '2024-12-19', '78-75', 9);

-- DRAFTS INSERTS
INSERT INTO Drafts (League_ID, DraftDate, DraftOrder, DraftStatus)
VALUES (1, '2024-12-01', 'S', 'I');

INSERT INTO Drafts (League_ID, DraftDate, DraftOrder, DraftStatus)
VALUES (2, '2024-12-05', 'R', 'I');

INSERT INTO Drafts (League_ID, DraftDate, DraftOrder, DraftStatus)
VALUES (3, '2024-12-10', 'S', 'I');

INSERT INTO Drafts (League_ID, DraftDate, DraftOrder, DraftStatus)
VALUES (4, '2024-12-15', 'R', 'I');

INSERT INTO Drafts (League_ID, DraftDate, DraftOrder, DraftStatus)
VALUES (5, '2024-12-20', 'S', 'C');

INSERT INTO Drafts (League_ID, DraftDate, DraftOrder, DraftStatus)
VALUES (6, '2024-12-25', 'R', 'C');

INSERT INTO Drafts (League_ID, DraftDate, DraftOrder, DraftStatus)
VALUES (7, '2024-12-30', 'S', 'I');

INSERT INTO Drafts (League_ID, DraftDate, DraftOrder, DraftStatus)
VALUES (8, '2025-01-05', 'R', 'I');

INSERT INTO Drafts (League_ID, DraftDate, DraftOrder, DraftStatus)
VALUES (9, '2025-01-10', 'S', 'C');

INSERT INTO Drafts (League_ID, DraftDate, DraftOrder, DraftStatus)
VALUES (10, '2025-01-15', 'R', 'I');

-- PLAYERS INSERTS
INSERT INTO Players (FullName, Sport, Position, RealTeam, FantasyPoints, AvailabilityStatus)
VALUES ('John Smith', 'FTB', 'WR', 'Eagles', 120.75, 'A');

INSERT INTO Players (FullName, Sport, Position, RealTeam, FantasyPoints, AvailabilityStatus)
VALUES ('Mike Johnson', 'FTB', 'RB', 'Panthers', 95.30, 'A');

INSERT INTO Players (FullName, Sport, Position, RealTeam, FantasyPoints, AvailabilityStatus)
VALUES ('Tenz Ngo', 'FTB', 'QB', 'Chiefs', 130.20, 'A');

INSERT INTO Players (FullName, Sport, Position, RealTeam, FantasyPoints, AvailabilityStatus)
VALUES ('Sinatraa Tran', 'FTB', 'WR', '49ers', 110.40, 'A');

INSERT INTO Players (FullName, Sport, Position, RealTeam, FantasyPoints, AvailabilityStatus)
VALUES ('Faker Li', 'FTB', 'RB', 'Patriots', 98.65, 'A');

INSERT INTO Players (FullName, Sport, Position, RealTeam, FantasyPoints, AvailabilityStatus)
VALUES ('Doublelift Chen', 'FTB', 'TE', 'Cowboys', 87.45, 'A');

INSERT INTO Players (FullName, Sport, Position, RealTeam, FantasyPoints, AvailabilityStatus)
VALUES ('Uzi Huang', 'FTB', 'LB', 'Rams', 105.75, 'A');

INSERT INTO Players (FullName, Sport, Position, RealTeam, FantasyPoints, AvailabilityStatus)
VALUES ('Scout Zhao', 'FTB', 'CB', 'Packers', 92.30, 'A');

INSERT INTO Players (FullName, Sport, Position, RealTeam, FantasyPoints, AvailabilityStatus)
VALUES ('Chovy Wu', 'FTB', 'WR', 'Giants', 115.20, 'A');

INSERT INTO Players (FullName, Sport, Position, RealTeam, FantasyPoints, AvailabilityStatus)
VALUES ('TheShy Zhang', 'FTB', 'DE', 'Steelers', 89.90, 'A');

-- PLAYERSTATISTICS INSERTS
INSERT INTO PlayerStatistics (Player_ID, GameDate, PerformanceStat, InjuryStatus)
VALUES (1, '2024-12-05', '{"touchdowns": 2, "yards": 120, "receptions": 5}', 'N');

INSERT INTO PlayerStatistics (Player_ID, GameDate, PerformanceStat, InjuryStatus)
VALUES (2, '2024-12-10', '{"touchdowns": 1, "yards": 85, "carries": 15}', 'N');

INSERT INTO PlayerStatistics (Player_ID, GameDate, PerformanceStat, InjuryStatus)
VALUES (3, '2024-12-12', '{"touchdowns": 3, "yards": 150, "passes": 10}', 'N');

INSERT INTO PlayerStatistics (Player_ID, GameDate, PerformanceStat, InjuryStatus)
VALUES (4, '2024-12-14', '{"touchdowns": 1, "yards": 95, "receptions": 7}', 'N');

INSERT INTO PlayerStatistics (Player_ID, GameDate, PerformanceStat, InjuryStatus)
VALUES (5, '2024-12-16', '{"touchdowns": 2, "yards": 110, "carries": 20}', 'N');

INSERT INTO PlayerStatistics (Player_ID, GameDate, PerformanceStat, InjuryStatus)
VALUES (6, '2024-12-18', '{"touchdowns": 0, "yards": 60, "blocks": 8}', 'N');

INSERT INTO PlayerStatistics (Player_ID, GameDate, PerformanceStat, InjuryStatus)
VALUES (7, '2024-12-20', '{"touchdowns": 1, "yards": 75, "tackles": 12}', 'N');

INSERT INTO PlayerStatistics (Player_ID, GameDate, PerformanceStat, InjuryStatus)
VALUES (8, '2024-12-22', '{"touchdowns": 0, "yards": 45, "interceptions": 2}', 'N');

INSERT INTO PlayerStatistics (Player_ID, GameDate, PerformanceStat, InjuryStatus)
VALUES (9, '2024-12-24', '{"touchdowns": 2, "yards": 115, "receptions": 8}', 'N');

INSERT INTO PlayerStatistics (Player_ID, GameDate, PerformanceStat, InjuryStatus)
VALUES (10, '2024-12-26', '{"touchdowns": 1, "yards": 80, "sacks": 3}', 'N');

-- TRADES INSERTS
INSERT INTO Trades (Team1_ID, Team2_ID, TradedPlayer1_ID, TradedPlayer2_ID, TradeDate)
VALUES (1, 2, 1, 2, '2024-12-15');

INSERT INTO Trades (Team1_ID, Team2_ID, TradedPlayer1_ID, TradedPlayer2_ID, TradeDate)
VALUES (3, 4, 3, 4, '2024-12-16');

INSERT INTO Trades (Team1_ID, Team2_ID, TradedPlayer1_ID, TradedPlayer2_ID, TradeDate)
VALUES (5, 6, 5, 6, '2024-12-17');

INSERT INTO Trades (Team1_ID, Team2_ID, TradedPlayer1_ID, TradedPlayer2_ID, TradeDate)
VALUES (7, 8, 7, 8, '2024-12-18');

INSERT INTO Trades (Team1_ID, Team2_ID, TradedPlayer1_ID, TradedPlayer2_ID, TradeDate)
VALUES (9, 10, 9, 10, '2024-12-19');

-- WAIVERS INSERTS
INSERT INTO Waivers (Team_ID, Player_ID, WaiverOrder, WaiverStatus, WaiverPickupDate)
VALUES (1, 2, 5, 'P', '2024-12-20');

INSERT INTO Waivers (Team_ID, Player_ID, WaiverOrder, WaiverStatus, WaiverPickupDate)
VALUES (2, 3, 3, 'P', '2024-12-21');

INSERT INTO Waivers (Team_ID, Player_ID, WaiverOrder, WaiverStatus, WaiverPickupDate)
VALUES (3, 4, 7, 'A', '2024-12-22');

INSERT INTO Waivers (Team_ID, Player_ID, WaiverOrder, WaiverStatus, WaiverPickupDate)
VALUES (4, 5, 2, 'P', '2024-12-23');

INSERT INTO Waivers (Team_ID, Player_ID, WaiverOrder, WaiverStatus, WaiverPickupDate)
VALUES (5, 6, 4, 'A', '2024-12-24');

-- PLAYERSTEAMS INSERTS
INSERT INTO PlayersTeams (Player_ID, Team_ID) VALUES (1, 1);
INSERT INTO PlayersTeams (Player_ID, Team_ID) VALUES (2, 1);

-- PLAYERSTEAMS DELETES
DELETE FROM PlayersTeams WHERE Player_ID = '2' AND Team_ID = '1';