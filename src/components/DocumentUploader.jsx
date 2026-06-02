import { useState, useRef } from "react";
import { supabase } from "../supabaseClient";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "pdf"]);

export default function DocumentUploader({ onUploadComplete, bucketName = "parish_documents", folderPath = "general" }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e) => {
    if (e.target.files.length > 0) processFiles(e.target.files);
  };

  const processFiles = async (files) => {
    setIsUploading(true);
    setError(null);
    const newFiles = [];
    const rejectedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
      const hasAllowedType = ALLOWED_MIME_TYPES.has(file.type);
      const hasAllowedExt = ALLOWED_EXTENSIONS.has(fileExt);

      if ((!file.type && !hasAllowedExt) || (file.type && !hasAllowedType) || !hasAllowedExt) {
        rejectedFiles.push(`${file.name} cannot be uploaded. Please use JPEG, PNG, or PDF only.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejectedFiles.push(`${file.name} is too large. Maximum file size is 50MB.`);
        continue;
      }

      // Creates a path like: "weddings/167890123-abcde.jpg"
      const uniqueFileName = `${folderPath}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      try {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(uniqueFileName, file, { cacheControl: '3600', upsert: false });

        if (error) throw error;

        newFiles.push({
          originalName: file.name,
          path: data.path,
        });
      } catch (error) {
        console.error("Upload error:", error.message);
        rejectedFiles.push(`Failed to upload ${file.name}. Please check the file and try again.`);
      }
    }

    const updatedFileList = newFiles.length > 0 ? [...uploadedFiles, ...newFiles] : uploadedFiles;
    setUploadedFiles(updatedFileList);
    if (rejectedFiles.length > 0) {
      setError(rejectedFiles.join(" "));
    }
    setIsUploading(false);

    if (newFiles.length > 0 && onUploadComplete) onUploadComplete(updatedFileList);
  };

  return (
    <div className="w-full">
      <div 
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ease-in-out ${
          isDragging ? "border-[#B59E74] bg-[#B59E74]/10" : "border-gray-300 bg-white hover:border-[#B59E74]/50 hover:bg-gray-50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-10 h-10 border-4 border-[#B59E74] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold text-[#B59E74] uppercase tracking-widest">Uploading files...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center cursor-pointer">
            <svg className="w-12 h-12 text-[#B59E74] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-1">Upload Requirements</h3>
            <p className="text-xs text-gray-500 font-serif italic mb-6">Drag and drop scanned documents, or click to browse.</p>
            <p className="text-xs font-bold text-[#B59E74] uppercase tracking-widest mb-3">JPEG, PNG, or PDF only</p>
            <p className="text-xs text-gray-500 font-serif italic mb-6">Maximum file size is 50MB per file. Please rename your uploaded file properly based on the given format. For example: "SURNAME_Birth_Certificate_2023.pdf"</p>
            <button type="button" className="bg-[#B59E74] text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest pointer-events-none">
              Browse Files
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="mt-4 bg-[#F6F5ED] border border-[#B59E74]/20 rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#B59E74] mb-3">Attached Files</p>
          <ul className="space-y-2">
            {uploadedFiles.map((file, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-gray-700 font-serif bg-white p-2 rounded-lg border border-gray-100">
                <span className="text-green-500 font-bold">✓</span> <span className="truncate">{file.originalName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
