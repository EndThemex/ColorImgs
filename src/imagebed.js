const API_BASE = 'https://img.scdn.io/api/v1.php';

export async function uploadImage(file, { cdn_domain = '', onProgress } = {}) {
  const form = new FormData();
  form.append('image', file, file.name);
  if (cdn_domain) form.append('cdn_domain', cdn_domain);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE, true);
    xhr.responseType = 'json';
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      };
    }
    xhr.onload = () => {
      const data = xhr.response || {};
      if (xhr.status >= 200 && xhr.status < 300 && data.success) {
        resolve({
          url: data.url || data.data?.url,
          filename: data.data?.filename,
          storage_backend: data.data?.storage_backend,
          reused: typeof data.message === 'string' && data.message.includes('秒传'),
        });
      } else {
        reject(new Error(data.error || data.message || `上传失败 HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('网络错误，上传失败'));
    xhr.send(form);
  });
}
