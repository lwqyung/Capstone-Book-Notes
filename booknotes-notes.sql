-- Table: public.notes

-- DROP TABLE IF EXISTS public.notes;

CREATE TABLE IF NOT EXISTS public.notes
(
    userid uuid NOT NULL,
    bookid character varying(20) COLLATE pg_catalog."default" NOT NULL,
    rating numeric(3,1),
    completiondate date,
    note text COLLATE pg_catalog."default",
    CONSTRAINT notes_pkey PRIMARY KEY (userid, bookid),
    CONSTRAINT notes_fk1 FOREIGN KEY (userid)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID,
    CONSTRAINT notes_fk2 FOREIGN KEY (bookid)
        REFERENCES public.books (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.notes
    OWNER to postgres;
-- Index: fki_notes_fk1

-- DROP INDEX IF EXISTS public.fki_notes_fk1;

CREATE INDEX IF NOT EXISTS fki_notes_fk1
    ON public.notes USING btree
    (userid ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: fki_notes_fk2

-- DROP INDEX IF EXISTS public.fki_notes_fk2;

CREATE INDEX IF NOT EXISTS fki_notes_fk2
    ON public.notes USING btree
    (bookid COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;