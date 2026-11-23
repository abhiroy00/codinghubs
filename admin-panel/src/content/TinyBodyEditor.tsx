import { Editor } from '@tinymce/tinymce-react'
import { useRef } from 'react'
// Self-hosted TinyMCE (GPL build): no API key, no cloud script, no "Upgrade" prompts.
import 'tinymce/tinymce'
import 'tinymce/models/dom'
import 'tinymce/themes/silver'
import 'tinymce/icons/default'
import 'tinymce/skins/ui/oxide/skin.js'
import 'tinymce/skins/ui/oxide/content.js'
import 'tinymce/skins/content/default/content.js'
import 'tinymce/plugins/advlist'
import 'tinymce/plugins/anchor'
import 'tinymce/plugins/autolink'
import 'tinymce/plugins/charmap'
import 'tinymce/plugins/code'
import 'tinymce/plugins/codesample'
import 'tinymce/plugins/fullscreen'
import 'tinymce/plugins/help'
import 'tinymce/plugins/help/js/i18n/keynav/en.js'
import 'tinymce/plugins/image'
import 'tinymce/plugins/link'
import 'tinymce/plugins/lists'
import 'tinymce/plugins/preview'
import 'tinymce/plugins/searchreplace'
import 'tinymce/plugins/table'
import 'tinymce/plugins/visualblocks'
import 'tinymce/plugins/wordcount'
import p400 from '../assets/fonts/poppins-400-latin.woff2?url'
import p500 from '../assets/fonts/poppins-500-latin.woff2?url'
import p600 from '../assets/fonts/poppins-600-latin.woff2?url'
import p700 from '../assets/fonts/poppins-700-latin.woff2?url'
import { uploadImage } from './RichEditor'

const abs = (u: string) => new URL(u, window.location.href).href
const FONT_FACES = [[400, p400], [500, p500], [600, p600], [700, p700]]
  .map(([w, u]) => `@font-face{font-family:Poppins;font-weight:${w};font-display:swap;src:url(${abs(String(u))}) format('woff2')}`)
  .join('')
const CONTENT_STYLE = `${FONT_FACES}
body{font-family:Poppins,system-ui,sans-serif;font-size:16px;line-height:1.7;color:#1f2937;margin:14px 18px}
h2{font-size:1.5em;line-height:1.3}h3{font-size:1.25em}h4{font-size:1.1em}
img{max-width:100%;height:auto}table{border-collapse:collapse}td,th{border:1px solid #d1d5db;padding:6px 10px}
pre{background:#0b1424;color:#e6edff;padding:12px;border-radius:8px}`

// Page chrome pasted from websites or Docs (the server removes it too).
const CHROME = 'header,nav,footer,aside,script,style,noscript,template,form,button,select,textarea,iframe,object,svg,[role=navigation],[role=banner],[role=contentinfo]'
const stripChrome = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll(CHROME).forEach((el) => el.remove())
  return doc.body.innerHTML
}

/** Blog article editor (TinyMCE): menu bar, formatting toolbar, image upload to our media endpoint, word count. */
export function TinyBodyEditor({ value, onChange, onBusy }: { value: string; onChange: (html: string) => void; onBusy: (busy: boolean) => void }) {
  const uploads = useRef(0)
  const track = async <T,>(p: Promise<T>) => {
    uploads.current += 1
    onBusy(true)
    try { return await p } finally { uploads.current -= 1; if (!uploads.current) onBusy(false) }
  }

  return (
    <Editor
      licenseKey="gpl"
      value={value}
      onEditorChange={(html) => onChange(html)}
      init={{
        height: 560,
        menubar: 'file edit view insert format tools table',
        plugins: 'advlist anchor autolink charmap code codesample fullscreen help image link lists preview searchreplace table visualblocks wordcount',
        toolbar: 'undo redo | blocks fontsize | bold italic underline | link image | bullist numlist | alignleft aligncenter alignright | removeformat',
        toolbar_mode: 'wrap',
        block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4; Quote=blockquote; Code=pre',
        font_size_formats: '10pt 11pt 12pt 14pt 16pt 18pt 20pt 24pt',
        placeholder: 'Yahan apna blog article likhiye...',
        promotion: false,
        branding: true,
        elementpath: true,
        statusbar: true,
        resize: true,
        browser_spellcheck: true,
        contextmenu: false,
        convert_urls: false,
        link_default_target: '_blank',
        link_assume_external_targets: true,
        image_caption: true,
        image_dimensions: false,
        automatic_uploads: true,
        images_file_types: 'jpg,jpeg,png,webp,gif',
        images_upload_handler: (blob) => track(uploadImage(blob.blob(), blob.filename())),
        file_picker_types: 'image',
        file_picker_callback: (cb) => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'image/jpeg,image/png,image/webp,image/gif'
          input.onchange = () => {
            const file = input.files?.[0]
            if (!file) return
            track(uploadImage(file, file.name)).then((url) => cb(url, { alt: file.name.replace(/\.[^.]+$/, '') })).catch(() => window.alert('Image upload nahi hua. JPG, PNG, WebP ya GIF (5 MB tak) choose karo.'))
          }
          input.click()
        },
        paste_preprocess: (_editor, args) => { args.content = stripChrome(args.content) },
        invalid_elements: 'script,style,iframe,object,embed,form,input,button,select,textarea,nav,header,footer,aside',
        content_style: CONTENT_STYLE,
      }}
    />
  )
}
