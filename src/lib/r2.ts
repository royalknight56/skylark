/**
 * R2 对象存储操作封装
 * @author skylark
 */

/** 上传文件到 R2 */
export async function uploadFile(
  r2: R2Bucket,
  key: string,
  data: ArrayBuffer | ReadableStream,
  metadata: {
    contentType: string;
    fileName: string;
  }
): Promise<R2Object> {
  return r2.put(key, data, {
    httpMetadata: {
      contentType: metadata.contentType,
    },
    customMetadata: {
      fileName: metadata.fileName,
    },
  });
}

/** 从 R2 获取文件 */
export async function getFile(
  r2: R2Bucket,
  key: string
): Promise<R2ObjectBody | null> {
  return r2.get(key);
}

/** 删除 R2 文件 */
export async function deleteFile(r2: R2Bucket, key: string): Promise<void> {
  await r2.delete(key);
}

/** 生成唯一的 R2 存储 key */
export function generateR2Key(
  prefix: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = fileName.includes('.') ? fileName.split('.').pop() : '';
  return `${prefix}/${timestamp}-${random}${ext ? '.' + ext : ''}`;
}
