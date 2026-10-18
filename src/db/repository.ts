import { eq, desc, and } from 'drizzle-orm';
import { db } from './index.ts';
import { users, brandSettings, files, generations } from './schema.ts';
import {
  UTECHTIPS_LOGO_DATA_URI,
  BENGALI_SAMPLE_DOCUMENTS,
} from '../lib/utechtipsLogo.ts';
import { sanitizeAndChunkText } from '../lib/textProcessor.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  fullName?: string,
  avatarUrl?: string
) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        fullName: fullName || email.split('@')[0],
        avatarUrl: avatarUrl || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          fullName: fullName || email.split('@')[0],
          avatarUrl: avatarUrl || null,
          updatedAt: new Date(),
        },
      })
      .returning();

    const user = result[0];

    const existingBrand = await db
      .select()
      .from(brandSettings)
      .where(eq(brandSettings.userId, user.id))
      .limit(1);

    let activeBrand = existingBrand[0];
    if (!activeBrand) {
      const insertedBrand = await db
        .insert(brandSettings)
        .values({
          userId: user.id,
          brandName: 'UTechtips',
          logoUrl: UTECHTIPS_LOGO_DATA_URI,
          primaryColor: '#181C24',
          accentColor: '#00C838',
          headingFont: 'Plus Jakarta Sans',
          bodyFont: 'DM Sans',
          layoutTemplate: 'executive_brief',
          headerText: 'UTECHTIPS · DOCUMENT INTELLIGENCE & LEGAL SYNTHESIS',
          footerText: 'Prepared by UTechtips DocuForge Studio · Verified OCR Formation',
          isDefault: true,
        })
        .returning();
      activeBrand = insertedBrand[0];
    } else if (!activeBrand.logoUrl || activeBrand.brandName === 'Meridian Enterprise') {
      // Upgrade existing default brand with the uploaded UTechtips logo
      const updatedBrand = await db
        .update(brandSettings)
        .set({
          brandName: 'UTechtips',
          logoUrl: UTECHTIPS_LOGO_DATA_URI,
          primaryColor: '#181C24',
          accentColor: '#00C838',
          headerText: 'UTECHTIPS · DOCUMENT INTELLIGENCE & LEGAL SYNTHESIS',
          footerText: 'Prepared by UTechtips DocuForge Studio · Verified OCR Formation',
          updatedAt: new Date(),
        })
        .where(eq(brandSettings.id, activeBrand.id))
        .returning();
      activeBrand = updatedBrand[0];
    }

    // Ensure the two uploaded Bengali PDFs are present in the user's files for immediate formation check
    const existingFiles = await db
      .select()
      .from(files)
      .where(eq(files.userId, user.id));

    const hasGazettePdf = existingFiles.some((f) =>
      f.originalName.includes('Bangladesh_Gazette_SRO_50_Law_2026')
    );

    if (!hasGazettePdf) {
      for (const doc of BENGALI_SAMPLE_DOCUMENTS) {
        const processed = sanitizeAndChunkText(doc.text);
        const insertedFile = await db
          .insert(files)
          .values({
            userId: user.id,
            originalName: doc.name,
            mimeType: doc.mimeType,
            fileSizeBytes: doc.fileSize,
            extractionMethod: 'ocr_vision',
            extractionStatus: 'completed',
            extractedText: processed.cleanedText,
            pageCount: doc.pageCount,
            wordCount: processed.wordCount,
            metadata: {
              parser: 'gemini-3.8-flash-multipage-ocr',
              confidence: 0.994,
              detectedScript: processed.detectedScript,
              chunkCount: processed.chunks.length,
              estimatedTokens: processed.estimatedTokens,
            },
          })
          .returning();

        if (
          insertedFile[0] &&
          doc.name.includes('Bangladesh_Gazette_SRO_50_Law_2026')
        ) {
          await db.insert(generations).values({
            userId: user.id,
            fileId: insertedFile[0].id,
            brandSettingId: activeBrand.id,
            outputType: 'formatted_document',
            title:
              'বাংলাদেশ শ্রম বিধিমালা সংশোধন গেজেট ২০২৬ — BPPCF তহবিল গঠন ও পরিচালনা কাঠামো',
            promptInstructions:
              'Format the Bangladesh Gazette S.R.O. No. 50-Law/2026 (Rules 226Ka–226Tha) into a structured branded legal document.',
            contentMarkdown: `**উপ-শিরোনাম:** শ্রম ও কর্মসংস্থান মন্ত্রণালয় প্রজ্ঞাপন (এস.আর.ও. নং ৫০-আইন/২০২৬ — ১৬ ফেব্রুয়ারি, ২০২৬)\n\n**সারসংক্ষেপ (Abstract):** বাংলাদেশ শ্রম আইন, ২০০৬ এর ধারা ৩৫১ ও ধারা ২৩২(৩) অনুযায়ী শতভাগ বৈদেশিক মুদ্রা বিনিয়োগকারী তেল, গ্যাস ও খনিজ অনুসন্ধান কোম্পানিসমূহের শ্রমিক-কর্মচারীদের জন্য 'Beneficiaries' Profit Participation Central Fund (BPPCF)' গঠন, নীট মুনাফার ১.৫% প্রদেয় চাঁদা, ৮০:২০ অনুপাতে হিসাব বণ্টন এবং পরিচালনা বোর্ডের পূর্ণাঙ্গ বিধিমালা।\n\n### বিধি ২২৬ক–২২৬গ. কেন্দ্রীয় তহবিল (BPPCF) গঠন, কার্যালয় ও ব্যবস্থাপনা\nএই বিধিমালা কার্যকর হইবার ০৬ (ছয়) মাসের মধ্যে সরকার তেল, গ্যাস ও খনিজ খাতের শতভাগ বৈদেশিক মুদ্রা বিনিয়োগকারী কোম্পানিসমূহের জন্য BPPCF গঠন করিবে। প্রধান কার্যালয় ঢাকায় থাকিবে এবং অতিরিক্ত সচিব পদমর্যাদার একজন কর্মকর্তা মহাপরিচালক (সদস্য-সচিব) নিযুক্ত হইবেন।\n\n> **Key Callout:** শতভাগ বৈদেশিক মুদ্রা বিনিয়োগকারী তেল ও গ্যাস কোম্পানিসমূহ তাহাদের বাৎসরিক নীট মুনাফার ১.৫% (এক দশমিক পাঁচ শতাংশ) অর্থ এই কেন্দ্রীয় তহবিলে প্রদান করিবে।\n\n### বিধি ২২৬ঙ. সুবিধাভোগীর যোগ্যতা, হিসাব বণ্টন (৮০% / ২০%) ও অনুদান হার\nন্যূনতম ৯ (নয়) মাস চাকরিকাল পূর্ণ হওয়া শ্রমিকগণ সুবিধাভোগী হইবেন। প্রাপ্ত অর্থের ৮০% 'সুবিধাভোগী হিসাব'-এ জমা হইয়া ২ মাসের মধ্যে EFT-এর মাধ্যমে সমভাবে বণ্টন করা হইবে এবং ২০% 'আপদকালীন কল্যাণ হিসাব'-এ জমা হইবে (যাহার ৫০% শ্রমিক কল্যাণ ফাউন্ডেশন তহবিলে এবং ৫০% মৃত্যু/অক্ষমতা/চিকিৎসা/শিক্ষাবৃত্তিতে ব্যবহৃত হইবে)।\n\n> **Key Callout:** কর্মক্ষেত্রে মৃত্যু বা স্থায়ী অক্ষমতায় ৫ লক্ষ টাকা, স্বাভাবিক মৃত্যুতে ৩ লক্ষ টাকা এবং অঙ্গহানিতে অনধিক ৫ লক্ষ টাকা এককালীন অনুদান প্রদেয়।`,
            structuredOutput: {
              title:
                'বাংলাদেশ শ্রম বিধিমালা সংশোধন গেজেট ২০২৬ — BPPCF তহবিল গঠন ও পরিচালনা কাঠামো',
              subtitle:
                'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার · শ্রম ও কর্মসংস্থান মন্ত্রণালয় (এস.আর.ও. নং ৫০-আইন/২০২৬ · ১৬ ফেব্রুয়ারি, ২০২৬)',
              documentReferenceCode: 'SRO-50-LAW-2026-BPPCF',
              abstract:
                'বাংলাদেশ শ্রম আইন, ২০০৬ এর ধারা ৩৫১ ও ধারা ২৩২(৩) অনুযায়ী শতভাগ বৈদেশিক মুদ্রা বিনিয়োগকারী তেল, গ্যাস ও খনিজ খাতের কোম্পানিসমূহের জন্য Beneficiaries’ Profit Participation Central Fund (BPPCF) গঠন ও পরিচালনার লক্ষ্যে বিধি ২২৬ক হইতে ২২৬ঠ সন্নিবেশিত হইয়াছে।',
              sections: [
                {
                  sectionNumber: '২২৬ক–২২৬গ',
                  heading: 'BPPCF গঠন, প্রধান কার্যালয় ও মহাপরিচালক নিয়োগ',
                  content:
                    'বিধিমালা কার্যকর হইবার ০৬ (ছয়) মাসের মধ্যে সরকার তেল এবং গ্যাসের মিশ্রণ, পরিশোধন বা খনিজ মওজুদের কাজে সংশ্লিষ্ট শতভাগ বৈদেশিক মুদ্রা বিনিয়োগকারী কোম্পানির জন্য BPPCF গঠন করিবে। বোর্ডের প্রধান কার্যালয় ঢাকায় অবস্থিত হইবে এবং একজন অতিরিক্ত সচিব পদমর্যাদার কর্মকর্তা মহাপরিচালক ও সদস্য-সচিব হিসাবে দায়িত্ব পালন করিবেন।',
                  keyCallout:
                    'কার্যকর হইবার ৬ মাসের মধ্যে তহবিল ও পরিচালনা বোর্ড গঠন বাধ্যতামূলক।',
                },
                {
                  sectionNumber: '২২৬ঘ–২২৬ঙ',
                  heading: 'তহবিলের অর্থের উৎস (১.৫% নীট মুনাফা) ও ৮০:২০ হিসাব বণ্টন',
                  content:
                    'সংশ্লিষ্ট আন্তর্জাতিক কোম্পানিসমূহ তাহাদের নীট মুনাফার ১.৫% অর্থ কেন্দ্রীয় তহবিলে চেকের মাধ্যমে জমা প্রদান করিবে। প্রাপ্ত মোট অর্থের ৮০% "সুবিধাভোগী হিসাব"-এ (৯ মাস চাকরি পূর্ণ হওয়া শ্রমিকদের মধ্যে EFT মারফত সমভাবে বণ্টনযোগ্য) এবং ২০% "আপদকালীন কল্যাণ হিসাব"-এ জমা হইবে।',
                  keyCallout:
                    'কর্মক্ষেত্রে মৃত্যু বা স্থায়ী অক্ষমতায় ৫ (পাঁচ) লক্ষ টাকা এবং স্বাভাবিক মৃত্যুতে ৩ (তিন) লক্ষ টাকা অনুদান।',
                },
                {
                  sectionNumber: '২২৬চ–২২৬ঠ',
                  heading: 'পরিচালনা বোর্ড, কোরাম, নিরীক্ষা (Audit) ও বার্ষিক প্রতিবেদন',
                  content:
                    'শ্রম ও কর্মসংস্থান মন্ত্রণালয়ের মন্ত্রী/উপদেষ্টা চেয়ারম্যান এবং সচিব ভাইস-চেয়ারম্যান হইবেন। মনোনীত সদস্যদের মেয়াদ ৩ বৎসর এবং প্রতি ৩ মাসে অন্তত একবার সভা অনুষ্ঠিত হইবে। প্রতি বৎসর Chartered Accountant দ্বারা নিরীক্ষা সম্পন্ন করিয়া ৩১ শে মার্চের মধ্যে সরকারের নিকট বার্ষিক প্রতিবেদন দাখিল করিতে হইবে।',
                  keyCallout:
                    'মহাপরিচালক বোর্ডের চেয়ারম্যানের অনুমতিক্রমে বাৎসরিক সর্বোচ্চ ৫ লক্ষ টাকা আকস্মিক ব্যয় মঞ্জুর করিতে পারিবেন।',
                },
              ],
              appendixNotes:
                'বাংলাদেশ গেজেট অতিরিক্ত সংখ্যা (পৃষ্ঠা ১২৯১৭–১২৯২৩), ১৬ ফেব্রুয়ারি ২০২৬ খ্রিষ্টাব্দ / ০৩ ফাল্গুন ১৪৩২ বঙ্গাব্দ হইতে সংকলিত।',
            },
            modelUsed: 'gemini-3.8-flash',
          });
        }
      }
    }

    return { user, activeBrand };
  } catch (error) {
    console.error('Database error in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user profile in database.', {
      cause: error,
    });
  }
}

export async function getUserBrandSetting(userId: number) {
  try {
    const rows = await db
      .select()
      .from(brandSettings)
      .where(eq(brandSettings.userId, userId))
      .orderBy(desc(brandSettings.updatedAt))
      .limit(1);
    return rows[0] || null;
  } catch (error) {
    console.error('Database error in getUserBrandSetting:', error);
    throw new Error('Failed to load brand settings.', { cause: error });
  }
}

export async function updateBrandSetting(
  userId: number,
  payload: {
    brandName: string;
    logoUrl?: string | null;
    primaryColor: string;
    accentColor: string;
    headingFont: string;
    bodyFont: string;
    layoutTemplate: string;
    headerText?: string;
    footerText?: string;
  }
) {
  try {
    const existing = await getUserBrandSetting(userId);
    if (existing) {
      const updated = await db
        .update(brandSettings)
        .set({
          brandName: payload.brandName,
          logoUrl:
            payload.logoUrl === undefined ? existing.logoUrl : payload.logoUrl,
          primaryColor: payload.primaryColor,
          accentColor: payload.accentColor,
          headingFont: payload.headingFont,
          bodyFont: payload.bodyFont,
          layoutTemplate: payload.layoutTemplate,
          headerText: payload.headerText ?? existing.headerText,
          footerText: payload.footerText ?? existing.footerText,
          updatedAt: new Date(),
        })
        .where(eq(brandSettings.id, existing.id))
        .returning();
      return updated[0];
    } else {
      const inserted = await db
        .insert(brandSettings)
        .values({
          userId,
          brandName: payload.brandName,
          logoUrl: payload.logoUrl || UTECHTIPS_LOGO_DATA_URI,
          primaryColor: payload.primaryColor,
          accentColor: payload.accentColor,
          headingFont: payload.headingFont,
          bodyFont: payload.bodyFont,
          layoutTemplate: payload.layoutTemplate,
          headerText: payload.headerText || '',
          footerText: payload.footerText || '',
          isDefault: true,
        })
        .returning();
      return inserted[0];
    }
  } catch (error) {
    console.error('Database error in updateBrandSetting:', error);
    throw new Error('Failed to save brand settings.', { cause: error });
  }
}

export async function getUserFiles(userId: number) {
  try {
    return await db
      .select()
      .from(files)
      .where(eq(files.userId, userId))
      .orderBy(desc(files.createdAt));
  } catch (error) {
    console.error('Database error in getUserFiles:', error);
    throw new Error('Failed to fetch uploaded files.', { cause: error });
  }
}

export async function getFileById(userId: number, fileId: number) {
  try {
    const rows = await db
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.userId, userId)))
      .limit(1);
    return rows[0] || null;
  } catch (error) {
    console.error('Database error in getFileById:', error);
    throw new Error('Failed to retrieve file record.', { cause: error });
  }
}

export async function createFileRecord(
  userId: number,
  payload: {
    originalName: string;
    mimeType: string;
    fileSizeBytes: number;
    extractionMethod: string;
    extractedText: string;
    pageCount: number;
    wordCount: number;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    const inserted = await db
      .insert(files)
      .values({
        userId,
        originalName: payload.originalName,
        mimeType: payload.mimeType,
        fileSizeBytes: payload.fileSizeBytes,
        extractionMethod: payload.extractionMethod,
        extractionStatus: 'completed',
        extractedText: payload.extractedText,
        pageCount: payload.pageCount,
        wordCount: payload.wordCount,
        metadata: payload.metadata || {},
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database error in createFileRecord:', error);
    throw new Error('Failed to store uploaded file record.', { cause: error });
  }
}

export async function updateFileExtractedText(
  userId: number,
  fileId: number,
  extractedText: string
) {
  try {
    const sanitized = sanitizeAndChunkText(extractedText);
    const updated = await db
      .update(files)
      .set({
        extractedText: sanitized.cleanedText,
        wordCount: sanitized.wordCount,
      })
      .where(and(eq(files.id, fileId), eq(files.userId, userId)))
      .returning();
    return updated[0] || null;
  } catch (error) {
    console.error('Database error in updateFileExtractedText:', error);
    throw new Error('Failed to update extracted text.', { cause: error });
  }
}

export async function deleteFileRecord(userId: number, fileId: number) {
  try {
    await db
      .delete(files)
      .where(and(eq(files.id, fileId), eq(files.userId, userId)));
    return true;
  } catch (error) {
    console.error('Database error in deleteFileRecord:', error);
    throw new Error('Failed to delete file record.', { cause: error });
  }
}

export async function getUserGenerations(
  userId: number,
  fileId?: number,
  outputType?: string
) {
  try {
    const conditions = [eq(generations.userId, userId)];
    if (fileId) {
      conditions.push(eq(generations.fileId, fileId));
    }
    if (outputType && outputType !== 'all') {
      conditions.push(eq(generations.outputType, outputType));
    }

    return await db
      .select()
      .from(generations)
      .where(and(...conditions))
      .orderBy(desc(generations.createdAt));
  } catch (error) {
    console.error('Database error in getUserGenerations:', error);
    throw new Error('Failed to fetch generation history.', { cause: error });
  }
}

export async function createGenerationRecord(
  userId: number,
  payload: {
    fileId: number;
    brandSettingId?: number | null;
    outputType: string;
    title: string;
    promptInstructions?: string;
    contentMarkdown: string;
    structuredOutput: Record<string, unknown>;
    modelUsed?: string;
  }
) {
  try {
    const inserted = await db
      .insert(generations)
      .values({
        userId,
        fileId: payload.fileId,
        brandSettingId: payload.brandSettingId || null,
        outputType: payload.outputType,
        title: payload.title,
        promptInstructions: payload.promptInstructions || null,
        contentMarkdown: payload.contentMarkdown,
        structuredOutput: payload.structuredOutput,
        modelUsed: payload.modelUsed || 'gemini-3.8-flash',
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database error in createGenerationRecord:', error);
    throw new Error('Failed to store generated output in database.', {
      cause: error,
    });
  }
}

export async function deleteGenerationRecord(
  userId: number,
  generationId: number
) {
  try {
    await db
      .delete(generations)
      .where(
        and(eq(generations.id, generationId), eq(generations.userId, userId))
      );
    return true;
  } catch (error) {
    console.error('Database error in deleteGenerationRecord:', error);
    throw new Error('Failed to delete generation record.', { cause: error });
  }
}
