-- Create missing bucket 'client-documents'
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Nullify references in clients table
UPDATE clients
SET doc_document_id = NULL
WHERE doc_document_id IN (
    SELECT id FROM documents WHERE bucket = 'client-documents'
);

-- Delete broken document references (since the bucket was missing, files are lost)
-- We delete them so they can be re-synced from Kommo or re-uploaded without errors.
DELETE FROM document_links
WHERE document_id IN (
    SELECT id FROM documents WHERE bucket = 'client-documents'
);

DELETE FROM documents
WHERE bucket = 'client-documents';
