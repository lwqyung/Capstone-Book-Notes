import pg from "pg";
import Pool from "pg-pool";
import ConnectPg from "connect-pg-simple";

export default class NotesDB {
    constructor() {
        this.dbpool = new Pool( {
            host: "localhost",
            port: 5432,
            database: "booknotes",
            user: process.env.DBUSER,
            password: process.env.DBPWD,
            query_timeout: 10000,
            statement_timeout: 10000
        });
        try {
            this.dbpool.query('SELECT NOW()')
                .then( () => this.dbConnected = true )
        } catch ( dberr ) {
            this.dbConnected = false;
        }
    }

    get isConnected() {
        return this.dbConnected;
    }

    getSessionStore(session) {
        var pgSession = ConnectPg(session);
        return new pgSession( {
            pool: this.dbpool
        } );
    }

    static errUnique = 23505;
    
    async execQuery( query, params = [] ) {
        let retVal = { err: 0, rows: [] };
        if (!this.dbConnected) {
            retVal.err = -1;
        } else {
            try {
                const results = await this.dbpool.query( query, params );
                retVal.rows = results.rows;
            } catch ( dberr ) {
                console.error( dberr );
                retVal.err = -1;

                if ( dberr.code )
                {
                    if ( dberr.code.startsWith( "08") )
                    {
                        this.dbConnected = false;
                    }
                    else if ( dberr.code === "23505" )
                    {
                        retVal.err = NotesDB.errUnique;
                    }
                }
            }
        }

        return retVal;
    }

    async getUserByEmail( email ) {
        const result = await this.execQuery( "SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length > 0) {
            return result.rows[0];
        }

        return null;
    }

    async getNotesByUserid( userid ) {
        const results = await this.execQuery( "SELECT b.id, b.title FROM notes n INNER JOIN books b on n.bookid = b.id WHERE n.userid = $1", [userid] );
        if ( results.rows.length > 0 ) {
            return results.rows;
        }

        return [];
    }

    async getNoteByUseridBookid( userid, isbn ) {
        const results = await this.execQuery( "SELECT * FROM notes n inner join books b on n.bookid = b.id WHERE n.userid = $1 and n.bookid = $2", [userid, isbn] );
        if ( results.err === 0 && results.rows.length > 0 )
        {
            return results.rows[0];
        }

        return null;
    }

    async updateNote( userid, isbn, completionDate, rating, description ) {
        let params = [ userid, isbn ];
        params.push( completionDate.length > 0 ? completionDate : null );
        params.push( rating.length > 0 ? Number(rating) : null );
        params.push( description );
        const results = await this.execQuery( "UPDATE notes SET completiondate = $3, rating = $4, note = $5 WHERE userid = $1 and bookid = $2", params );
        
        return results.err === 0;
    }

    async deleteNote( userid, isbn ) {
        const results = await this.execQuery( "DELETE FROM notes WHERE userid = $1 AND bookid = $2", [userid, isbn] );
        
        return results.err === 0;
    }

    async getISBN( titleLower, authorLower ) {
        const results = await this.execQuery( "SELECT id FROM books WHERE LOWER( title ) = $1 AND LOWER( author ) = $2", [titleLower, authorLower] );
        if ( results.err == 0 && results.rows.length > 0 ) {
            return results.rows[0].id;
        }

        return null;
    }

    async addBook( isbn, title, author ) {
        const results = await this.execQuery( "INSERT INTO books ( id, title, author ) VALUES ( $1, $2, $3)", [ isbn, title, author ]);

        return results.err === 0;
    }

    async addNote( userid, isbn, completionDate, rating, description ) {
        let fields = "userid, bookid";
        let params = "$1, $2";
        let paramCount = 2;
        let paramArgs = [ userid, isbn ];
        if ( completionDate.length > 0 ) {
            fields += ", completiondate";
            params += `, $${++paramCount}`;
            paramArgs.push( completionDate );
        }
        if ( rating.length > 0 ) {
            fields += ", rating";
            params += `, $${++paramCount}`;            
            paramArgs.push( Number(rating) );
        }
        if ( description.length > 0 ) {
            fields += ", note";
            params += `, $${++paramCount}`;            
            paramArgs.push( description );
        }
        const results = await this.execQuery( `INSERT INTO notes (${fields}) VALUES (${params})`, paramArgs );
        
        return results.err;
    }
}