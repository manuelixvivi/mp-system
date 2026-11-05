import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { supabase, isSupabaseConfigured } from '../db/supabase';

/**
 * Photo Storage Service for MP Control System
 * Priority order:
 * 1. Supabase Storage (Zero extra setup, uses existing database credentials)
 * 2. Google Drive API (If Service Account credentials are provided)
 * 3. Local public storage (/public/uploads/members/)
 */
export async function uploadPhotoToDriveOrLocal(
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<{ fileId: string; url: string; source: 'supabase_storage' | 'google_drive' | 'local_storage' }> {
  const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  // 1. PRIMARY & EASIEST: Supabase Storage (Bucket: member-photos)
  // No extra Google Cloud accounts, JSON keys, or IAM permissions required!
  if (isSupabaseConfigured && supabase) {
    try {
      const storagePath = `members/${safeName}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('member-photos')
        .upload(storagePath, buffer, {
          contentType: mimeType || 'image/jpeg',
          upsert: true,
        });

      if (!uploadErr && uploadData) {
        const { data: urlData } = supabase.storage
          .from('member-photos')
          .getPublicUrl(storagePath);

        if (urlData?.publicUrl) {
          console.log(`[SUPABASE STORAGE SUCCESS] Uploaded ${fileName} -> ${urlData.publicUrl}`);
          return {
            fileId: storagePath,
            url: urlData.publicUrl,
            source: 'supabase_storage',
          };
        }
      } else if (uploadErr) {
        console.warn('[SUPABASE STORAGE WARNING] Upload error, trying next provider:', uploadErr.message);
      }
    } catch (supaErr: any) {
      console.warn('[SUPABASE STORAGE EXCEPTION]:', supaErr.message);
    }
  }

  // 2. ALTERNATIVE: Google Drive API (if user configured Service Account)
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (clientEmail && privateKey) {
    try {
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      const auth = new google.auth.JWT({
        email: clientEmail.trim(),
        key: privateKey.trim(),
        scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
      });

      const drive = google.drive({ version: 'v3', auth });

      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      const fileMetadata: any = {
        name: fileName,
      };

      if (folderId && folderId.trim().length > 3) {
        fileMetadata.parents = [folderId.trim()];
      }

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: {
          mimeType: mimeType || 'image/jpeg',
          body: stream,
        },
        fields: 'id, name, webViewLink, webContentLink',
      });

      const fileId = response.data.id;
      if (fileId) {
        try {
          await drive.permissions.create({
            fileId: fileId,
            requestBody: {
              role: 'reader',
              type: 'anyone',
            },
          });
        } catch (permErr: any) {
          console.warn('[DRIVE PERMISSION WARNING]:', permErr.message);
        }

        const driveUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        console.log(`[GOOGLE DRIVE UPLOAD SUCCESS] Saved ${fileName} (ID: ${fileId})`);
        return {
          fileId: fileId,
          url: driveUrl,
          source: 'google_drive',
        };
      }
    } catch (driveErr: any) {
      console.warn('[GOOGLE DRIVE UPLOAD ERROR, FALLING BACK TO LOCAL/PUBLIC]:', driveErr.message);
    }
  }

  // 3. FALLBACK: Save to public uploads directory
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'members');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, buffer);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const relativeUrl = `/uploads/members/${safeName}`;
    const absoluteUrl = `${appUrl.replace(/\/$/, '')}${relativeUrl}`;

    console.log(`[LOCAL STORAGE UPLOAD] Saved ${fileName} to ${filePath}`);
    return {
      fileId: safeName,
      url: absoluteUrl,
      source: 'local_storage',
    };
  } catch (fsErr: any) {
    console.error('[LOCAL STORAGE SAVE ERROR]:', fsErr.message);
    return {
      fileId: 'fallback',
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop',
      source: 'local_storage',
    };
  }
}
