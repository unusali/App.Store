import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import {
  getOrCreateUser,
  updateBrandSetting,
  getUserFiles,
  getFileById,
  createFileRecord,
  updateFileExtractedText,
  deleteFileRecord,
  getUserGenerations,
  createGenerationRecord,
  deleteGenerationRecord,
} from './src/db/repository.ts';
import {
  extractTextFromUploadedFile,
  generateDocumentOutput,
  translateDocumentGeneration,
  GenerationOutputType,
} from './src/lib/gemini.ts';
import { sanitizeAndChunkText } from './src/lib/textProcessor.ts';
import { assembleBrandedHtmlDocument } from './src/lib/documentExporter.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.txt',
  '.md',
  '.csv',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  async function resolveDbUser(req: AuthRequest) {
    if (!req.user) {
      throw new Error('Unauthorized request');
    }
    const { user, activeBrand } = await getOrCreateUser(
      req.user.uid,
      req.user.email || `${req.user.uid}@user.utechtips.app`,
      req.user.name,
      req.user.picture
    );
    return { user, activeBrand };
  }

  // Optional auth resolver for the interactive Writing Bar so it works both signed-in (persisted to PostgreSQL) and in instant preview mode
  async function resolveOptionalDbUser(req: express.Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.split('Bearer ')[1];
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      const { user, activeBrand } = await getOrCreateUser(
        decoded.uid,
        decoded.email || `${decoded.uid}@user.utechtips.app`,
        decoded.name,
        decoded.picture
      );
      return { user, activeBrand };
    } catch {
      return null;
    }
  }

  // 1. GET /api/me — Sync user profile, UTechtips brand settings, files, and generations
  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { user, activeBrand } = await resolveDbUser(req);
      const [userFiles, userGenerations] = await Promise.all([
        getUserFiles(user.id),
        getUserGenerations(user.id),
      ]);

      res.json({
        user,
        brandSetting: activeBrand,
        files: userFiles,
        generations: userGenerations,
      });
    } catch (error: any) {
      console.error('Error in GET /api/me:', error);
      res.status(500).json({
        error: error.message || 'Failed to load workspace profile.',
      });
    }
  });

  // 2. PUT /api/brand-settings — Update custom logo, brand fonts, colors, and layout template
  app.put('/api/brand-settings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { user } = await resolveDbUser(req);
      const {
        brandName,
        logoUrl,
        primaryColor,
        accentColor,
        headingFont,
        bodyFont,
        layoutTemplate,
        headerText,
        footerText,
      } = req.body;

      if (
        !brandName ||
        !primaryColor ||
        !accentColor ||
        !headingFont ||
        !bodyFont ||
        !layoutTemplate
      ) {
        return res
          .status(400)
          .json({ error: 'Missing required brand settings fields.' });
      }

      const updated = await updateBrandSetting(user.id, {
        brandName,
        logoUrl,
        primaryColor,
        accentColor,
        headingFont,
        bodyFont,
        layoutTemplate,
        headerText,
        footerText,
      });

      res.json({ brandSetting: updated });
    } catch (error: any) {
      console.error('Error in PUT /api/brand-settings:', error);
      res.status(500).json({
        error: error.message || 'Failed to update brand settings.',
      });
    }
  });

  // 3. GET /api/files — List uploaded files for user
  app.get('/api/files', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { user } = await resolveDbUser(req);
      const userFiles = await getUserFiles(user.id);
      res.json({ files: userFiles });
    } catch (error: any) {
      console.error('Error in GET /api/files:', error);
      res.status(500).json({
        error: error.message || 'Failed to fetch uploaded files.',
      });
    }
  });

  // 4. POST /api/files/upload — Validate, extract text (PDF/DOCX/TXT/Image), sanitize, chunk & store in PostgreSQL
  app.post('/api/files/upload', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { user } = await resolveDbUser(req);
      const {
        fileName,
        mimeType,
        fileSize,
        base64Data,
        preExtractedText,
        pageCount,
      } = req.body;

      if (!fileName || typeof fileName !== 'string') {
        return res.status(400).json({ error: 'Valid fileName is required.' });
      }

      const ext = path.extname(fileName).toLowerCase();
      if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
        return res.status(400).json({
          error: `Unsupported file extension "${ext}". Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}`,
        });
      }

      if (fileSize && Number(fileSize) > MAX_FILE_SIZE_BYTES) {
        return res.status(413).json({
          error: 'File size exceeds the 20MB maximum limit.',
        });
      }

      let extractionResult;
      if (
        typeof preExtractedText === 'string' &&
        preExtractedText.trim().length > 0
      ) {
        const sanitized = sanitizeAndChunkText(preExtractedText);
        extractionResult = {
          extractedText: sanitized.cleanedText,
          extractionMethod: 'ocr_vision' as const,
          pageCount:
            Number(pageCount) ||
            Math.max(1, Math.ceil(sanitized.wordCount / 300)),
          wordCount: sanitized.wordCount,
          metadata: {
            parser: 'pre-extracted-sanitizer',
            confidence: 0.995,
            detectedScript: sanitized.detectedScript,
            chunkCount: sanitized.chunks.length,
            estimatedTokens: sanitized.estimatedTokens,
            chunksPreview: sanitized.chunks.map((c) => ({
              chunkIndex: c.chunkIndex,
              wordCount: c.wordCount,
              charCount: c.charCount,
              estimatedTokens: c.estimatedTokens,
            })),
          },
        };
      } else {
        if (!base64Data) {
          return res
            .status(400)
            .json({ error: 'base64Data is required for file extraction.' });
        }
        extractionResult = await extractTextFromUploadedFile({
          fileName,
          mimeType: mimeType || 'application/octet-stream',
          base64Data,
        });
      }

      const savedFile = await createFileRecord(user.id, {
        originalName: fileName,
        mimeType: mimeType || 'text/plain',
        fileSizeBytes:
          Number(fileSize) ||
          Buffer.byteLength(extractionResult.extractedText, 'utf8'),
        extractionMethod: extractionResult.extractionMethod,
        extractedText: extractionResult.extractedText,
        pageCount: extractionResult.pageCount,
        wordCount: extractionResult.wordCount,
        metadata: extractionResult.metadata,
      });

      res.status(201).json({ file: savedFile });
    } catch (error: any) {
      console.error('Error in POST /api/files/upload:', error);
      res.status(500).json({
        error:
          error.message || 'Failed to upload and extract text from file.',
      });
    }
  });

  // 5. PATCH /api/files/:id — Update extracted text after manual user review/edit
  app.patch('/api/files/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { user } = await resolveDbUser(req);
      const fileId = Number(req.params.id);
      const { extractedText } = req.body;

      if (typeof extractedText !== 'string') {
        return res
          .status(400)
          .json({ error: 'extractedText string is required.' });
      }

      const updated = await updateFileExtractedText(
        user.id,
        fileId,
        extractedText
      );
      if (!updated) {
        return res.status(404).json({ error: 'File not found.' });
      }
      res.json({ file: updated });
    } catch (error: any) {
      console.error('Error in PATCH /api/files/:id:', error);
      res.status(500).json({
        error: error.message || 'Failed to update extracted text.',
      });
    }
  });

  // 6. DELETE /api/files/:id — Delete file and its generations
  app.delete('/api/files/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { user } = await resolveDbUser(req);
      const fileId = Number(req.params.id);
      await deleteFileRecord(user.id, fileId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in DELETE /api/files/:id:', error);
      res.status(500).json({
        error: error.message || 'Failed to delete file.',
      });
    }
  });

  // 7. GET /api/generations — List generated outputs with optional fileId / outputType filter
  app.get('/api/generations', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { user } = await resolveDbUser(req);
      const fileId = req.query.fileId ? Number(req.query.fileId) : undefined;
      const outputType = req.query.outputType
        ? String(req.query.outputType)
        : undefined;

      const list = await getUserGenerations(user.id, fileId, outputType);
      res.json({ generations: list });
    } catch (error: any) {
      console.error('Error in GET /api/generations:', error);
      res.status(500).json({
        error: error.message || 'Failed to load generations.',
      });
    }
  });

  // 8. POST /api/generations — Generate Summary, Q&A, Paragraphs, AI Image Prompts, or Formatted Document
  app.post('/api/generations', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { user, activeBrand } = await resolveDbUser(req);
      const { fileId, outputType, customInstructions, language } = req.body;

      if (!fileId || !outputType) {
        return res
          .status(400)
          .json({ error: 'fileId and outputType are required.' });
      }

      const fileRecord = await getFileById(user.id, Number(fileId));
      if (!fileRecord) {
        return res.status(404).json({ error: 'Source file not found.' });
      }

      const generated = await generateDocumentOutput({
        fileName: fileRecord.originalName,
        extractedText: fileRecord.extractedText,
        outputType: outputType as GenerationOutputType,
        customInstructions,
        brandName: activeBrand?.brandName || 'UTechtips',
        layoutTemplate: activeBrand?.layoutTemplate || 'executive_brief',
        language: language === 'en' ? 'en' : 'bn',
      });

      const savedGen = await createGenerationRecord(user.id, {
        fileId: fileRecord.id,
        brandSettingId: activeBrand?.id || null,
        outputType,
        title: generated.title,
        promptInstructions: customInstructions,
        contentMarkdown: generated.contentMarkdown,
        structuredOutput: generated.structuredOutput,
        modelUsed: 'gemini-3.8-flash',
      });

      res.status(201).json({ generation: savedGen });
    } catch (error: any) {
      console.error('Error in POST /api/generations:', error);
      res.status(500).json({
        error: error.message || 'Failed to generate output from document.',
      });
    }
  });

  // 9. POST /api/composer — Ultra-fast 1s Writing Bar endpoint
  app.post('/api/composer', async (req, res) => {
    try {
      const {
        prompt,
        outputType = 'formatted_document',
        fileId,
        contextText,
        contextFileName,
        attachedFile, // optional { fileName, mimeType, fileSize, base64Data }
        brandName = 'UTechtips',
        layoutTemplate = 'executive_brief',
        language = 'bn',
        allowGeneralKnowledge = false,
      } = req.body;

      if (!prompt && !attachedFile && !contextText) {
        return res.status(400).json({
          error: 'Please enter a writing prompt or attach a document.',
        });
      }

      let sourceText = contextText || '';
      let sourceFileName = contextFileName || 'Direct Writing Prompt';
      let savedFileRecord: any = null;

      // Start optional DB user resolution in parallel so it never blocks generation
      const resolvedPromise = resolveOptionalDbUser(req).catch(() => null);

      // If user attached a new file in the writing bar, extract its text first
      if (attachedFile && attachedFile.base64Data) {
        const extracted = await extractTextFromUploadedFile({
          fileName: attachedFile.fileName || 'Attached_File',
          mimeType: attachedFile.mimeType || 'application/octet-stream',
          base64Data: attachedFile.base64Data,
        });
        sourceText = extracted.extractedText;
        sourceFileName = attachedFile.fileName || 'Attached_File';
      }

      const effectiveSourceText =
        allowGeneralKnowledge || !sourceText.trim()
          ? `USER PROMPT: ${prompt}`
          : `${sourceText.slice(0, 3500)}\n\nUSER PROMPT: ${prompt || 'Synthesize this document.'}`;

      const generated = await generateDocumentOutput({
        fileName: allowGeneralKnowledge ? 'Gemini AI General Knowledge' : sourceFileName,
        extractedText: effectiveSourceText,
        outputType: outputType as GenerationOutputType,
        customInstructions: prompt,
        brandName,
        layoutTemplate,
        language: language === 'en' ? 'en' : 'bn',
        allowGeneralKnowledge: Boolean(allowGeneralKnowledge),
      });

      const immediateGeneration = {
        id: Date.now(),
        fileId: fileId || 1,
        outputType,
        title: generated.title,
        promptInstructions: prompt,
        contentMarkdown: generated.contentMarkdown,
        structuredOutput: generated.structuredOutput,
        modelUsed: 'gemini-3.1-flash-lite',
        createdAt: new Date().toISOString(),
      };

      // Send response immediately for ~1-second UX
      res.status(201).json({
        generation: immediateGeneration,
        uploadedFile: savedFileRecord,
      });

      // Persist asynchronously in background if user is authenticated
      resolvedPromise
        .then(async (resolved) => {
          if (!resolved?.user) return;
          let targetFileId = fileId ? Number(fileId) : null;
          if (!targetFileId) {
            const sanitizedPrompt = sanitizeAndChunkText(effectiveSourceText);
            const createdPromptFile = await createFileRecord(resolved.user.id, {
              originalName:
                attachedFile?.fileName ||
                `Prompt_${new Date().toISOString().slice(0, 10)}.txt`,
              mimeType: attachedFile?.mimeType || 'text/plain',
              fileSizeBytes: Buffer.byteLength(effectiveSourceText, 'utf8'),
              extractionMethod: 'native_parser',
              extractedText: sanitizedPrompt.cleanedText,
              pageCount: 1,
              wordCount: sanitizedPrompt.wordCount,
              metadata: { parser: 'writing-bar-prompt', chunkCount: 1 },
            });
            targetFileId = createdPromptFile.id;
          }
          await createGenerationRecord(resolved.user.id, {
            fileId: targetFileId,
            brandSettingId: resolved.activeBrand?.id || null,
            outputType,
            title: generated.title,
            promptInstructions: prompt,
            contentMarkdown: generated.contentMarkdown,
            structuredOutput: generated.structuredOutput,
            modelUsed: 'gemini-3.1-flash-lite',
          });
        })
        .catch((bgErr) =>
          console.warn('Background composer DB save skipped:', bgErr)
        );
    } catch (error: any) {
      console.error('Error in POST /api/composer:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: error.message || 'Failed to process writing bar request.',
        });
      }
    }
  });

  // 9b. POST /api/translate — Translate any document/generation between English and Bangla (বাংলা)
  app.post('/api/translate', async (req, res) => {
    try {
      const {
        title,
        contentMarkdown,
        outputType = 'formatted_document',
        targetLanguage = 'en',
        brandName = 'UTechtips',
      } = req.body;

      if (!title && !contentMarkdown) {
        return res
          .status(400)
          .json({ error: 'Document title or content is required to translate.' });
      }

      const translated = await translateDocumentGeneration({
        title: title || 'Document',
        contentMarkdown: contentMarkdown || '',
        outputType: outputType as GenerationOutputType,
        targetLanguage: targetLanguage === 'en' ? 'en' : 'bn',
        brandName,
      });

      res.json({
        generation: {
          id: Date.now(),
          fileId: 1,
          outputType,
          title: translated.title,
          contentMarkdown: translated.contentMarkdown,
          structuredOutput: translated.structuredOutput,
          modelUsed: 'gemini-3.8-flash',
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Error in POST /api/translate:', error);
      res.status(500).json({
        error: error.message || 'Failed to translate document between English and Bangla.',
      });
    }
  });

  // 10. POST /api/export-html — Assemble standalone exportable HTML/PDF document with custom logo & fonts
  app.post('/api/export-html', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { activeBrand } = await resolveDbUser(req);
      const { generation, brandOverride, sourceFileName } = req.body;

      if (!generation || !generation.title) {
        return res
          .status(400)
          .json({ error: 'generation payload is required.' });
      }

      const effectiveBrand = brandOverride || activeBrand;
      const htmlDocument = assembleBrandedHtmlDocument(
        {
          ...generation,
          sourceFileName,
        },
        effectiveBrand
      );

      res.json({ html: htmlDocument });
    } catch (error: any) {
      console.error('Error in POST /api/export-html:', error);
      res.status(500).json({
        error: error.message || 'Failed to assemble exportable HTML document.',
      });
    }
  });

  // 11. DELETE /api/generations/:id — Delete a generated output record
  app.delete(
    '/api/generations/:id',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const { user } = await resolveDbUser(req);
        const genId = Number(req.params.id);
        await deleteGenerationRecord(user.id, genId);
        res.json({ success: true });
      } catch (error: any) {
        console.error('Error in DELETE /api/generations/:id:', error);
        res.status(500).json({
          error: error.message || 'Failed to delete generation record.',
        });
      }
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`UTechtips DocuForge Studio listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
