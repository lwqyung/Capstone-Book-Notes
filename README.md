# Capstone-Book-Notes

Pre-requisites:
- Bash environment
- npm in Bash environment
- nodepm in Bash environment
- PostgreSQL database, with a table called "books" created by the following schema:
    id varchar(20) PRIMARY KEY,
    title varchar(80),
    completiondate date,
    rating numeric(3,1),
    notes text

To run project:
1. In Bash shell, run "npm i" to install project dependencies.
2. In index.js, modify lines 13-17 for the PostgreSQL database where the "books" table is.
3. Run nodemon index.js.
