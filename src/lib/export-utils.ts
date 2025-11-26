import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { ProcessedFile } from './file-processing';

export interface Message {
  role: "user" | "assistant";
  content: string;
  attachments?: ProcessedFile[];
}

const formatMessageForText = (msg: Message): string => {
  const role = msg.role === 'user' ? 'User' : 'Assistant';
  let text = `[${role}]: ${msg.content}\n`;
  if (msg.attachments && msg.attachments.length > 0) {
    text += `[Attachments: ${msg.attachments.map(a => a.name).join(', ')}]\n`;
  }
  return text;
};

export const exportToTxt = (messages: Message[], filename: string = 'chat-export') => {
  const content = messages.map(formatMessageForText).join('\n-------------------\n\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${filename}.txt`);
};

export const exportToMarkdown = (messages: Message[], filename: string = 'chat-export') => {
  const content = messages.map(msg => {
    const role = msg.role === 'user' ? '**User**' : '**Assistant**';
    let text = `${role}:\n\n${msg.content}\n`;
    if (msg.attachments && msg.attachments.length > 0) {
      text += `\n*Attachments: ${msg.attachments.map(a => a.name).join(', ')}*\n`;
    }
    return text;
  }).join('\n---\n\n');
  
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `${filename}.md`);
};

export const exportToJson = (messages: Message[], filename: string = 'chat-export') => {
  const content = JSON.stringify(messages, null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  saveAs(blob, `${filename}.json`);
};

export const exportToPdf = (messages: Message[], filename: string = 'chat-export') => {
  const doc = new jsPDF();
  let y = 20;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const maxWidth = doc.internal.pageSize.width - (margin * 2);

  doc.setFontSize(16);
  doc.text('Chat Export', margin, y);
  y += 10;

  doc.setFontSize(12);

  messages.forEach(msg => {
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    
    // Check for page break
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(`${role}:`, margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    
    // Split text to fit width
    const lines = doc.splitTextToSize(msg.content, maxWidth);
    
    // Check if content fits on page, if not, print what fits and move to next
    if (y + (lines.length * 7) > pageHeight - 20) {
       // Simple handling: just add page if the whole block doesn't fit roughly
       // A better implementation would split the lines across pages
       doc.addPage();
       y = 20;
    }
    
    doc.text(lines, margin, y);
    y += (lines.length * 7) + 5;

    if (msg.attachments && msg.attachments.length > 0) {
       const attachText = `[Attachments: ${msg.attachments.map(a => a.name).join(', ')}]`;
       doc.setFont('helvetica', 'italic');
       doc.text(attachText, margin, y);
       y += 10;
    }
    
    y += 5; // Extra spacing between messages
  });

  doc.save(`${filename}.pdf`);
};

export const exportToDocx = async (messages: Message[], filename: string = 'chat-export') => {
  const children = [
    new Paragraph({
      text: "Chat Export",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: "" }), // Spacer
  ];

  messages.forEach(msg => {
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${role}:`,
            bold: true,
            size: 24, // 12pt
          }),
        ],
      })
    );

    // Split content by newlines to preserve basic formatting
    const lines = msg.content.split('\n');
    lines.forEach(line => {
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: line,
                        size: 24,
                    })
                ]
            })
        );
    });

    if (msg.attachments && msg.attachments.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[Attachments: ${msg.attachments.map(a => a.name).join(', ')}]`,
              italics: true,
              size: 20,
            }),
          ],
        })
      );
    }

    children.push(new Paragraph({ text: "" })); // Spacer
    children.push(new Paragraph({ 
        children: [new TextRun({ text: "----------------------------------------" })] 
    }));
    children.push(new Paragraph({ text: "" })); // Spacer
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
};
