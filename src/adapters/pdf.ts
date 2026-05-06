import { pdfjs } from "react-pdf"

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`

export async function extractTextFromPDF(file: File): Promise<string[]> {
  const blobUrl = URL.createObjectURL(file)
  const loadingTask = pdfjs.getDocument(blobUrl)
  const pages: string[] = []

  try {
    const pdf = await loadingTask.promise

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()

      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")

      pages.push(pageText)
    }
  } finally {
    URL.revokeObjectURL(blobUrl)
    loadingTask.destroy()
  }

  return pages
}