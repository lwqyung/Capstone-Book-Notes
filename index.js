import express from "express";
import bodyparser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = new express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyparser.urlencoded({ extended: true }));

const db = new pg.Client( {
    host: "localhost",
    port: 5432,
    database: "booknotes",
    user: "postgres",
    password: "",
    query_timeout: 10000,
    statement_timeout: 10000
});

let dbConnected = false;

try {
    await db.connect();
    dbConnected = true;
} catch ( dberr ) {
    console.error( dberr );
}

async function dbQuery( query, params = [] )
{
    let retVal = { err: 0, rows: [] };
    try {
        const results = await db.query( query, params );
        retVal.rows = results.rows;
    } catch ( dberr ) {
        console.error( dberr );
        if ( dberr.code && dberr.code.startsWith( "08") )
        {
            dbConnected = false;
        }
        retVal.err = -1;
    }

    return retVal;
}

function idCheck( id )
{
    return id.length <= 20 ? true: false;
}

app.get( "/", async (req, res) => {
    const results = await dbQuery( "SELECT id, title, completiondate, rating FROM books" );
    if ( dbConnected )
    {
        if ( results.rows.length > 0 )
        {
            res.locals.booklist = results.rows;
        }
        res.render( "index.ejs" );
    }
    else
    {
    res.render( "error.ejs" );
    }
});

app.get( "/notes/*", async (req, res ) => {
    if ( idCheck( req.params['0'] ) )
    {
        const results = await dbQuery( "SELECT * FROM books WHERE id = $1", [req.params['0']] );
        if ( dbConnected && results.err === 0 && results.rows.length > 0 )
        {
            res.locals.book = results.rows[0];
            res.render( "notes.ejs" );
            return;    
        }

        res.locals.errmsg = "Book not found.";
    }

    res.render( "error.ejs" );    
} );

app.get( "/edit/*", async (req, res ) => {
    if ( idCheck( req.params['0'] ) )
    {
        const results = await dbQuery( "SELECT * FROM books WHERE id = $1", [req.params['0']] );
        if ( dbConnected && results.err === 0 && results.rows.length > 0 )
        {
            res.locals.book = results.rows[0];
            res.render( "edit.ejs" );
            return;    
        }

        res.locals.errmsg = "Book not found.";
    }

    res.render( "error.ejs" );    
} );

app.post( "/edit/*", async (req, res ) => {
    if ( idCheck( req.params['0'] ) )
    {
        let params = [ req.params['0'] ];
        params.push( req.body.bookCompletionDate ? req.body.bookCompletionDate : null );
        params.push( req.body.bookRating ? req.body.bookRating : null );
        params.push( req.body.bookdescription ? req.body.bookdescription : null );
        const results = await dbQuery( "UPDATE books SET completiondate = $2, rating = $3, notes = $4 WHERE id = $1", params );
        if ( dbConnected && results.err === 0 )
        {
            res.redirect( "/notes/" + req.params['0'] );
            return;
        }

        res.locals.errmsg = "Error occurred while updating book.";
    }

    res.render( "error.ejs" );    
} );

app.post( "/delete/*", async (req, res ) => {
    if ( idCheck( req.params['0'] ) )
    {
        const results = await dbQuery( "DELETE FROM books WHERE id = $1", [req.params['0']] );
        if ( dbConnected && results.err === 0 )
        {
            res.redirect( "/" );
            return;
        }

        res.locals.errmsg = "Error occurred while deleting book.";
    }

    res.render( "error.ejs" );    
} );

app.get( "/new", async (req, res ) => {
    res.render( "new.ejs" );
} );

app.post( "/new", async (req, res ) => {
    const apiResult = await axios.get( "https://openlibrary.org/search.json", { params: { title: req.body.bookTitle } } );
    if( apiResult.data.numFound > 0 )
    {
        let fields = "id, title";
        let params = "$1, $2";
        let paramCount = 2;
        let paramArgs = [ apiResult.data.docs[0].lccn[0], req.body.bookTitle ];
        if ( req.body.bookCompletionDate )
        {
            fields += ", completiondate";
            params += `, $${++paramCount}`;
            paramArgs.push( req.body.bookCompletionDate );
        }
        if ( req.body.bookRating )
        {
            fields += ", rating";
            params += `, $${++paramCount}`;            
            paramArgs.push( req.body.bookRating );
        }
        if ( req.body.bookdescription )
        {
            fields += ", notes";
            params += `, $${++paramCount}`;            
            paramArgs.push( req.body.bookdescription );
        }
        const results = await dbQuery( `INSERT INTO books (${fields}) VALUES (${params})`, paramArgs );
        if ( dbConnected && results.err === 0 )
        {
            res.redirect( "/" );
            return;
        }
    }
    else
    {
        if ( apiResult.status === 200 )
        {
            res.locals.errmsg = "Title could not be found. Please verify you have spelled it correctly."
            res.locals.bookTitle = req.body.bookTitle;
            res.locals.bookCompletionDate = req.body.bookCompletionDate;
            res.locals.bookRating = req.body.bookRating;
            res.locals.bookdescription = req.body.bookdescription;
            res.render( "new.ejs" );
            return;
        }
    }

    res.locals.errmsg = "Error occurred while adding new book.";
    res.render( "error.ejs" );
} );

app.listen( port, () => {
    console.log( `listening on port ${port}`);
});