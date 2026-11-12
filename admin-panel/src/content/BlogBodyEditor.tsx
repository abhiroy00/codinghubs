import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import { uploadImage } from './RichEditor'

const extensions = [
  StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false } }),
  Image.configure({ allowBase64: false }),
  TableKit,
]

export function BlogBodyEditor({ value, onChange, onBusy }: { value: string; onChange: (html: string) => void; onBusy: (busy: boolean) => void }) {
  const [source, setSource] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [link, setLink] = useState('')
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const imageInput = useRef<HTMLInputElement>(null)
  const editor = useEditor({
    extensions,
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { role: 'textbox', 'aria-label': 'Article', 'aria-multiline': 'true', id: 'content' } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
  })
  const state = useEditorState({ editor, selector: ({ editor }) => editor ? {
    bold: editor.isActive('bold'), italic: editor.isActive('italic'),
    bullet: editor.isActive('bulletList'), ordered: editor.isActive('orderedList'),
    heading: editor.isActive('heading') ? String(editor.getAttributes('heading').level) : 'p',
    undo: editor.can().undo(), redo: editor.can().redo(),
  } : null })
  // Saved/recovered/source content may arrive after the editor mounts. Avoid emitting a write on load.
  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.getHTML() !== value) editor.commands.setContent(value, { emitUpdate: false })
  }, [editor, value])

  const addImage = async (file?: File) => {
    if (!file || !editor) return
    setUploading(true)
    onBusy(true)
    setMessage('')
    try {
      const src = await uploadImage(file, file.name)
      if (!editor.isDestroyed) editor.chain().focus().setImage({ src, alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') }).run()
    } catch { setMessage('Image upload failed. Choose a JPG, PNG, WebP or GIF under 5 MB and try again.') }
    finally { setUploading(false); onBusy(false) }
  }
  const applyLink = () => {
    const href = link.trim()
    if (href && !/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(href)) {
      setMessage('Enter a full https:// address or a page link starting with /.')
      return
    }
    if (href) editor?.chain().focus().extendMarkRange('link').setLink({ href }).run()
    else editor?.chain().focus().extendMarkRange('link').unsetLink().run()
    setLinkOpen(false)
    setMessage('')
  }
  return <section className="ad-blog-body-editor" aria-labelledby="article-label">
    <div className="ad-rich-head">
      <label id="article-label" htmlFor={source ? 'article-source' : 'content'}>Article</label>
      <button type="button" className="ad-link" onClick={() => { setSource(!source); setLinkOpen(false) }}>{source ? 'Visual editor' : 'Edit HTML'}</button>
    </div>
    {!source && editor && <div className="ad-blog-toolbar" role="group" aria-label="Article formatting">
      <select aria-label="Text style" value={state?.heading ?? 'p'} onChange={(e) => {
        const level = Number(e.target.value) as 2 | 3 | 4
        if (e.target.value === 'p') editor.chain().focus().setParagraph().run()
        else editor.chain().focus().setHeading({ level }).run()
      }}><option value="p">Paragraph</option><option value="2">Heading 2</option><option value="3">Heading 3</option><option value="4">Heading 4</option></select>
      <button type="button" aria-label="Bold" aria-pressed={state?.bold ?? false} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></button>
      <button type="button" aria-label="Italic" aria-pressed={state?.italic ?? false} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></button>
      <button type="button" aria-pressed={state?.bullet ?? false} onClick={() => editor.chain().focus().toggleBulletList().run()}>Bullets</button>
      <button type="button" aria-pressed={state?.ordered ?? false} onClick={() => editor.chain().focus().toggleOrderedList().run()}>Numbered</button>
      <button type="button" onClick={() => { setLink(String(editor.getAttributes('link').href ?? '')); setLinkOpen(!linkOpen) }}>Link</button>
      <button type="button" disabled={uploading} onClick={() => imageInput.current?.click()}>{uploading ? 'Uploading…' : 'Image'}</button>
      <button type="button" disabled={!state?.undo} onClick={() => editor.chain().focus().undo().run()}>Undo</button>
      <button type="button" disabled={!state?.redo} onClick={() => editor.chain().focus().redo().run()}>Redo</button>
    </div>}
    <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden aria-label="Article image file" onChange={(e) => { void addImage(e.target.files?.[0]); e.target.value = '' }} />
    {linkOpen && <div className="ad-blog-link-box">
      <label htmlFor="article-link">Link address</label>
      <input id="article-link" className="ad-input" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://example.com" />
      <button type="button" className="ad-btn" onClick={applyLink}>Apply link</button>
      <button type="button" className="ad-link" onClick={() => setLinkOpen(false)}>Cancel</button>
    </div>}
    {source ? <textarea id="article-source" className="ad-input ad-code" aria-label="Article HTML" rows={14} value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} /> : <EditorContent editor={editor} className="ad-blog-visual" />}
    {message && <p className="ad-field-error" role="alert">{message}</p>}
    <p className="ad-hint">Use Heading 2 and Heading 3 to create the article’s contents automatically.</p>
  </section>
}
