import express from "express";
import bodyparser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import NotesDB from "./notesdb.js";

const app = new express();
const port = 3000;

dotenv.config();

let notesDB = new NotesDB();

app.use(express.static("public"));
app.use(bodyparser.urlencoded({ extended: true }));

app.use(session( {
    store: notesDB.getSessionStore(session),
    secret: process.env.COOKIESECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' ? true : false }
} ));
app.use(passport.initialize());
app.use(passport.session());

passport.use( new Strategy( async function verify(email, password, cb) {
    const errmsg = "Incorrect email or password. Please try again.";
    try {
        const user = await notesDB.getUserByEmail( email );
        if ( user !== null ) {
            const storedHashedPassword = user.password;
            bcrypt.compare(password, storedHashedPassword, (err, result) => {
                if (err) {
                    return cb( err);
                } else {
                    if (result) {
                        return cb(null, user);
                    } else {
                        return cb( null, false, { message: errmsg } );
                    }
                }
            });
        } else {
            return cb( null, false, { message: errmsg });
        }
    } catch (err) {
        return cb(err);
    }
} ) );

passport.serializeUser( (user, cb) => {
    process.nextTick( () => {
        return cb(null, {id: user.id, name: user.name});
    });
});
  
passport.deserializeUser( (user, cb) => {
    process.nextTick( () => {
        return cb(null, user);
    } );
});

function idCheck( id )
{
    return id.length <= 20 ? true: false;
}

function hideSignup( req, res ) {
    if ( req.isAuthenticated() ) {
        res.locals.hideSignup = "hidden";
    }

    return;
}

function hideLogin( req, res ) {
    if ( req.isAuthenticated() ) {
        res.locals.hideLogin = "hidden";
    }

    return;
}

app.get( "/", async (req, res) => {
    hideSignup(req, res);
    hideLogin(req, res);
    if ( notesDB.isConnected ) {
        if (req.isAuthenticated()) {
            res.locals.username = req.user.name;
            const userid = req.user.id;
            const notes = await notesDB.getNotesByUserid( userid );
            if ( notes.length > 0 ) {
                res.locals.booklist = notes;
            }
        } else {
            res.locals.hideBooksAddDelete = "hidden";
        }

        res.render( "index.ejs" );
    } else {
        res.render( "error.ejs" );
    }
});

app.get( "/notes/*", async (req, res ) => {
    if ( !req.isAuthenticated() ) {
        res.locals.errmsg = "Login in first before attempting to view your book notes.";
        res.render( "error.ejs" );
        return;
    }

    hideSignup(req, res);
    hideLogin(req, res);

    if ( idCheck( req.params['0'] ) && notesDB.isConnected ) {
        const note = await notesDB.getNoteByUseridBookid( req.user.id, req.params['0'] );
        if ( note !== null )
        {
            res.locals.book = note;
            res.render( "notes.ejs" );
            return;    
        }

        res.locals.errmsg = "Book not found.";
    }

    res.render( "error.ejs" );    
} );

app.get( "/edit/*", async (req, res ) => {
    if ( !req.isAuthenticated() ) {
        res.locals.errmsg = "Login in first before attempting to edit your book notes.";
        res.render( "error.ejs" );
        return;
    }

    hideSignup(req, res);
    hideLogin(req, res);

    if ( idCheck( req.params['0'] ) && notesDB.isConnected )
    {
        const note = await notesDB.getNoteByUseridBookid( req.user.id, req.params['0'] );
        if ( note !== null )
        {
            res.locals.book = note;
            res.render( "edit.ejs" );
            return;    
        }

        res.locals.errmsg = "Book not found.";
    }

    res.render( "error.ejs" );    
} );

app.post( "/edit/*", async (req, res ) => {
    hideSignup(req, res);
    hideLogin(req, res);

    if ( !req.isAuthenticated() ) {
        res.locals.errmsg = "Login in first before attempting to edit your book notes.";
        res.render( "error.ejs" );
        return;
    }

    if ( idCheck( req.params['0'] ) )
    {
        const success = await notesDB.updateNote( req.user.id, req.params['0'], req.body.bookCompletionDate, req.body.bookRating, req.body.bookdescription );
        if ( success ) {
            res.redirect( "/notes/" + req.params['0'] );
            return;
        }

        res.locals.errmsg = "Error occurred while updating book.";
    }

    res.render( "error.ejs" );    
} );

app.post( "/delete/*", async (req, res ) => {
    hideSignup(req, res);
    hideLogin(req, res);

    if ( !req.isAuthenticated() ) {
        res.locals.errmsg = "Login in first before attempting to delete your book notes.";
        res.render( "error.ejs" );
        return;
    }

    if ( idCheck( req.params['0'] ) )
    {
        if (req.isAuthenticated()) {
            const success = await notesDB.deleteNote( req.user.id, req.params['0'] );
            if ( success )
            {
                res.redirect( "/" );
                return;
            }
        }

        res.locals.errmsg = "Error occurred while deleting book.";
    }

    res.render( "error.ejs" );    
} );

app.get( "/new", async (req, res ) => {
    hideSignup(req, res);
    hideLogin(req, res);

    if ( !req.isAuthenticated() ) {
        res.locals.errmsg = "Login in first before attempting to add your book notes.";
        res.render( "error.ejs" );
        return;
    }

    res.render( "new.ejs" );
} );

app.post( "/new", async (req, res ) => {
    hideSignup(req, res);
    hideLogin(req, res);

    if ( !req.isAuthenticated() ) {
        res.locals.errmsg = "Login in first before attempting to add your book notes.";
        res.render( "error.ejs" );
        return;
    }

    const userid = req.user.id;
    const bookTitle = req.body.bookTitle.trim();
    const bookTitleLower = bookTitle.toLowerCase();
    const author = req.body.bookAuthor.trim();
    const authorLower = author.toLowerCase();
    let isbn = "";
    if ( notesDB.isConnected ) {
        isbn = await notesDB.getISBN( bookTitleLower, authorLower );
        if ( isbn === null ) {
            const apiResult = await axios.get( "https://openlibrary.org/search.json", { params: { title: bookTitle, author: author, sort: "old" } } );
            if( apiResult.data.numFound > 0 ) {
                for ( let i = 0; i < apiResult.data.docs.length; i++ ) {
                    const foundTitle = apiResult.data.docs[i].title;
                    const foundAuthor = apiResult.data.docs[i].author_name;
                    if ( foundTitle.toLowerCase() === bookTitleLower &&
                         foundAuthor.filter( (x) => x.toLowerCase() === authorLower ).length > 0 &&
                         apiResult.data.docs[i].isbn ) {
                        isbn = apiResult.data.docs[i].isbn[0];
                        const err = await notesDB.addBook( isbn, foundTitle, foundAuthor.toString() );
                        if ( !err ) {
                            res.render( "error.ejs" );
                            return;
                        }

                        break;
                    }
                }
            } else {
                if ( apiResult.status === 200 ) {
                    res.locals.errmsg = "Title could not be found online. Please verify you have spelled it and the author correctly."
                    res.locals.bookTitle = req.body.bookTitle;
                    res.locals.bookCompletionDate = req.body.bookCompletionDate;
                    res.locals.bookRating = req.body.bookRating;
                    res.locals.bookdescription = req.body.bookdescription;
                    res.locals.bookAuthor = req.body.bookAuthor;
                    res.render( "new.ejs" );
                    return;
                } else {
                    console.error( `error occurred while looking up book ISBN ${apiResult.status}` );
                    res.render( "error.ejs" );
                    return;
                }
            }
        }

        if ( isbn.length == 0 ) {
            res.render( "error.ejs" );
            return;
        }

        const err = await notesDB.addNote( userid, isbn, req.body.bookCompletionDate, req.body.bookRating, req.body.bookdescription );
        switch ( err ) {
            case NotesDB.errUnique: {
                res.locals.errmsg = "Title already exists in your list. Please verify you have entered the correct title."
                res.locals.bookTitle = req.body.bookTitle;
                res.locals.bookCompletionDate = req.body.bookCompletionDate;
                res.locals.bookRating = req.body.bookRating;
                res.locals.bookdescription = req.body.bookdescription;
                res.locals.bookAuthor = req.body.bookAuthor;
                res.render( "new.ejs" );       
                break;
            }
            case 0: {
                res.redirect( "/" );
                break;
            }
            default: {
                res.locals.errmsg = "Error occurred while adding new book.";
                res.render( "error.ejs" );
                break;
            }
        }

        return;
    } else {
        res.render( "error.ejs" );
    }
} );

app.get( "/signup", async (req, res) => {
    if ( notesDB.isConnected )
    {
        res.locals.hideSignup = "hidden";
        res.render( "signup.ejs" );
    }
    else
    {
        res.render( "error.ejs" );
    }
});

app.post( "/signup", async (req, res) => {
    if ( notesDB.isConnected )
    {
        const newEmail = req.body.email;
        let results = await notesDB.execQuery( "SELECT 1 FROM users WHERE email = $1", [newEmail] );
        if ( results.rows.length > 0 )
        {
            res.locals.hideSignup = "hidden";
            res.locals.warning = "There is already an account using this email address. Please try a different email address, or login with your existing account.";
            res.render( "signup.ejs" );
            return;
        }

        const newUsername = req.body.username;
        const newPassword = req.body["new-password"];
        bcrypt.hash(newPassword, 10, async (err, hash) => {
            if (err) {
                console.error("Error hashing password:", err);
                res.locals.warning = "There was an error while creating your account. Please try again.";
                res.locals.hideSignup = "hidden";
                res.render( "signup.ejs" );
                return;    
            } else {
                results = await notesDB.execQuery( "INSERT INTO users ( id, name, password, email ) VALUES ( gen_random_uuid(), $1, $2, $3 ) RETURNING *", [newUsername, hash, newEmail] );
                if ( !notesDB.isConnected || results.err !== 0 ) {
                    res.locals.warning = "There was an error while creating your account. Please try again.";
                    res.locals.hideSignup = "hidden";
                    res.render( "signup.ejs" );
                    return;
                } else {
                    const user = results.rows[0];
                    req.login(user, (err) => {
                        if ( err ) {
                            console.log( err );
                        } else {
                            res.redirect( "/" );
                        }
                    });
                }
            }
        });
    }
    else
    {
        res.render( "error.ejs" );
    }
});

app.get( "/login", async (req, res) => {
    if ( notesDB.isConnected )
    {
        if ( req.session.messages ) {
            res.locals.warning = req.session.messages[0];
            req.session.messages = [];
        }
        res.locals.hideLogin = "hidden";
        res.locals.authenticating = "true";
        res.render( "login.ejs" );
    }
    else
    {
        res.render( "error.ejs" );
    }
});

app.post( '/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureMessage: true
}));

app.post( "/logout", async (req, res) => {
    hideSignup(req, res);
    hideLogin(req, res);

    if ( notesDB.isConnected ) {
        if ( req.isAuthenticated() ) {
            req.logout( (err) => {
                if (err) {
                    return next(err)
                };
            });
        }

        res.redirect( "/" );
    } else {
        res.render( "error.ejs" );
    }
});

app.listen( port, () => {
    console.log( `listening on port ${port}`);
});
