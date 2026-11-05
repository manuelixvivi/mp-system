import { v2 as cloudinary } from 'cloudinary';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { supabase, isSupabaseConfigured } from '../db/supabase';

// Configure Cloudinary if URL is provided
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
  });
}

/**
 * Uploads a photo buffer to Cloudinary with Full HD Original Quality (No Compression/No Blur)
 * Falls back to Supabase Storage -> Local Storage if Cloudinary is unavailable.
 */
export async function uploadPhotoToDriveOrLocal(
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<{ fileId: string; url: string; source: 'cloudinary' | 'supabase_storage' | 'google_drive' | 'local_storage' }> {
  const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  // 1. TOP PRIORITY: Cloudinary (Full HD, Uncompressed, Generous Quota)
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (cloudinaryUrl) {
    try {
      // Get real wall-clock epoch timestamp to prevent stale request error if system clock has drifted
      let epochSeconds = Math.floor(Date.now() / 1000);
      try {
        const headRes = await fetch('https://www.cloudflare.com', { method: 'HEAD', cache: 'no-store' });
        const dateHeader = headRes.headers.get('date');
        if (dateHeader) {
          epochSeconds = Math.floor(new Date(dateHeader).getTime() / 1000);
        }
      } catch (e) {
        // Fallback to local system time if network check fails
      }

      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'mp_community/members',
            resource_type: 'image',
            timestamp: epochSeconds,
            // Keep full original quality (no compression, no blur, no downscale)
            quality: 100,
            unique_filename: true,
          },
          (err, res) => {
            if (err) reject(err);
            else resolve(res);
          }
        );
        uploadStream.end(buffer);
      });

      if (uploadResult?.secure_url) {
        console.log(`[CLOUDINARY FULL HD SUCCESS] Uploaded ${fileName} -> ${uploadResult.secure_url}`);
        return {
          fileId: uploadResult.public_id,
          url: uploadResult.secure_url,
          source: 'cloudinary',
        };
      }
    } catch (cErr: any) {
      console.warn('[CLOUDINARY UPLOAD WARNING]:', cErr.message, 'Falling back to Supabase Storage...');
    }
  }

  // 2. ALTERNATIVE: Supabase Storage (Bucket: member-photos)
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
        console.warn('[SUPABASE STORAGE WARNING] Upload error:', uploadErr.message);
      }
    } catch (supaErr: any) {
      console.warn('[SUPABASE STORAGE EXCEPTION]:', supaErr.message);
    }
  }

  // 3. ALTERNATIVE: Google Drive API (if user configured Service Account)
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

      const fileMetadata: any = { name: fileName };
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
            requestBody: { role: 'reader', type: 'anyone' },
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

  // 4. FALLBACK: Save to public uploads directory
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

// Export alias
export const uploadPhotoToCloudinaryOrFallback = uploadPhotoToDriveOrLocal;
