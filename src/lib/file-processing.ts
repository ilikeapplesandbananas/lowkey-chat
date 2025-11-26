import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
// We use a CDN for the worker to avoid complex build configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ProcessedFile {
  name: string;
  type: 'text' | 'image' | 'pdf';
  content: string; // Text content for text/pdf, Base64 for image
  preview?: string; // Base64 preview for images
}

export const processFile = async (file: File): Promise<ProcessedFile> => {
  const fileType = file.type;

  if (fileType.startsWith('image/')) {
    return processImage(file);
  } else if (fileType === 'application/pdf') {
    return processPdf(file);
  } else if (
    fileType.startsWith('text/') || 
    file.name.endsWith('.txt') || 
    file.name.endsWith('.md') || 
    file.name.endsWith('.json') ||
    file.name.endsWith('.js') ||
    file.name.endsWith('.ts') ||
    file.name.endsWith('.tsx') ||
    file.name.endsWith('.csv')
  ) {
    return processText(file);
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
};

const processImage = (file: File): Promise<ProcessedFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      resolve({
        name: file.name,
        type: 'image',
        content: result, // Base64
        preview: result
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const processText = (file: File): Promise<ProcessedFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      resolve({
        name: file.name,
        type: 'text',
        content: result
      });
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

const processPdf = async (file: File): Promise<ProcessedFile> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += `[Page ${i}]\n${pageText}\n\n`;
    }

    return {
      name: file.name,
      type: 'pdf',
      content: fullText.trim()
    };
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
};
