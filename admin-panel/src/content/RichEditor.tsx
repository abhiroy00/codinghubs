import { Editor } from '@tinymce/tinymce-react'
import { useEffect, useState } from 'react'
import { adminApi } from '../api'

const KEY = import.meta.env.VITE_TINYMCE_API_KEY as string | undefined

/** Upload to our own endpoint (validated and re-encoded on the server); returns the public /media/ URL. */
export async function uploadImage(file: Blob, name = 'image.png'): Promise<string> {
  const fd = new FormData()
  fd.append('file', file, name)
  const { data } = await adminApi.post<{ url: string }>('/media/', fd)
  return data.url
}

/**
 * TinyMCE (cloud, API key from VITE_TINYMCE_API_KEY). The key is a client-side integration key, not a secret: restrict it
 * to codinghubs.in in the Tiny account. Without a key, or if the script cannot load, a plain HTML box is offered so
 * content can still be written. Whatever the editor produces is sanitised again on the server.
 */
export function RichEditor({ id, label, value, onChange, height = 520 }: { id: string; label: string; value: string; onChange: (html: string) => void; height?: number }) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(!KEY)
  const [plain, setPlain] = useState(false)

  useEffect(() => {
    if (!KEY || ready) return
    const t = setTimeout(() => setFailed(true), 15000)
    return () => clearTimeout(t)
  }, [ready])

  const usePlain = plain || (failed && !ready)

  return (
    <div className="ad-rich">
      <div className="ad-rich-head">
        <label htmlFor={id}>{label}</label>
        {KEY && (
          <button type="button" className="ad-link" onClick={() => setPlain((p) => !p)}>
            {usePlain ? 'Use rich editor' : 'Edit as HTML'}
          </button>
        )}
      </div>
      {!KEY && (
        <p className="ad-note" role="status">
          Rich editor is off: set <code>VITE_TINYMCE_API_KEY</code> (see DEPLOY.md). You can still write HTML here.
        </p>
      )}
      {KEY && failed && !ready && (
        <p className="ad-note" role="alert">
          The editor did not load (check the network and that this domain is allowed for your TinyMCE key). Using the HTML box instead.
        </p>
      )}
      {usePlain ? (
        <textarea id={id} className="ad-input ad-code" rows={18} value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
      ) : (
        <>
          {!ready && (
            <div className="ad-skeleton" role="status" aria-live="polite" style={{ height }}>
              Loading editor…
            </div>
          )}
          <div style={{ display: ready ? 'block' : 'none' }}>
            <Editor
              id={id}
              apiKey={KEY}
              value={value}
              onEditorChange={(html) => onChange(html)}
              onInit={() => setReady(true)}
              init={{
                height,
                menubar: false,
                branding: true,
                promotion: false,
                plugins: 'lists link image table code codesample autolink autoresize wordcount',
                toolbar:
                  'undo redo | blocks | bold italic underline | bullist numlist | blockquote hr | link image table | codesample code | removeformat',
                block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4',
                toolbar_mode: 'wrap',
                autoresize_bottom_margin: 30,
                min_height: height,
                max_height: 1400,
                image_description: true,
                image_title: false,
                automatic_uploads: true,
                paste_data_images: true,
                images_file_types: 'jpeg,jpg,png,webp,gif',
                images_upload_handler: async (blobInfo: { blob: () => Blob; filename: () => string }) => uploadImage(blobInfo.blob(), blobInfo.filename()),
                relative_urls: false,
                convert_urls: false,
                link_default_protocol: 'https',
                link_title: false,
                target_list: false,
                browser_spellcheck: true,
                content_style:
                  "body{font-family:Inter,system-ui,sans-serif;font-size:17px;line-height:1.7;color:#2a2f3d;max-width:760px;margin:1rem auto}h2,h3,h4{font-family:Poppins,Inter,sans-serif;color:#0a1a3f}a{color:#1554d6}blockquote{border-left:4px solid #ffcb3d;background:#fffae6;margin:1rem 0;padding:.4rem 1rem}pre{background:#0b1530;color:#e8eefc;padding:1rem;border-radius:8px}img{max-width:100%;height:auto}table{border-collapse:collapse}td,th{border:1px solid #cfd8e8;padding:.4rem .6rem}",
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}
