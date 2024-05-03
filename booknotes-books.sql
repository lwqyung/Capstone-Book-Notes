-- Table: public.books

-- DROP TABLE IF EXISTS public.books;

CREATE TABLE IF NOT EXISTS public.books
(
    id character varying(20) COLLATE pg_catalog."default" NOT NULL,
    title character varying(80) COLLATE pg_catalog."default",
    author character varying(80) COLLATE pg_catalog."default",
    CONSTRAINT books_pk PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.books
    OWNER to postgres;
-- Index: books_author

-- DROP INDEX IF EXISTS public.books_author;

CREATE INDEX IF NOT EXISTS books_author
    ON public.books USING btree
    (author COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: books_title

-- DROP INDEX IF EXISTS public.books_title;

CREATE INDEX IF NOT EXISTS books_title
    ON public.books USING btree
    (title COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;