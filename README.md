# Capstone-Book-Notes

Pre-requisites:
- Bash environment
- npm in Bash environment
- nodepm in Bash environment
- PostgreSQL database, containing four tables:
    - books (for information about specific books, specifically ISBN, title, and author); created by booknotes-users.sql
    - notes (for notes created by users about specific books); created by booknotes-notes.sql
    - users (for user information, including encrypted passwords); created by booknotes-users.sql
    - session (used by passportJS for user login sessions); created by table.sql

To run project:
1. In Bash shell, run "npm i" to install project dependencies.
2. On a PostgreSQL server, create the four tables using the scripts referenced above.
3. In notesdb.js, modify lines 8-10 for the PostgreSQL server host, port, and database name.
4. In the root directory where the web application files are, create a .env file containing key-value pairs:
    DBUSER (login user for the PostgreSQL database containing the tables created in Step 2)
    DBPWD (login password for the PostgreSQL user)
    COOKIESECRET (the secret key used by the passportJS login sessions)
5. Run nodemon index.js.
