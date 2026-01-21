import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface DocumentUploadProps {
  trustId: string;
  onUploadComplete?: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export default function DocumentUpload({ trustId, onUploadComplete }: DocumentUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadingFile>>(new Map());
  const { toast } = useToast();

  const uploadFile = async (file: File) => {
    const fileId = `${file.name}-${Date.now()}`;
    
    setUploadingFiles(prev => new Map(prev).set(fileId, {
      file,
      progress: 0,
      status: 'uploading'
    }));

    try {
      const filePath = `${trustId}/${Date.now()}-${file.name}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('trust-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('trust_documents')
        .insert({
          trust_id: trustId,
          document_name: file.name,
          file_path: filePath,
          document_type: 'uploaded', // or determine from file type
          review_status: 'pending'
        });

      if (dbError) throw dbError;

      setUploadingFiles(prev => {
        const updated = new Map(prev);
        updated.set(fileId, {
          file,
          progress: 100,
          status: 'success'
        });
        return updated;
      });

      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded.`,
      });

      setTimeout(() => {
        setUploadingFiles(prev => {
          const updated = new Map(prev);
          updated.delete(fileId);
          return updated;
        });
      }, 3000);

      onUploadComplete?.();

    } catch (error) {
      console.error('Upload error:', error);
      
      setUploadingFiles(prev => {
        const updated = new Map(prev);
        updated.set(fileId, {
          file,
          progress: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        });
        return updated;
      });

      toast({
        title: "Upload failed",
        description: `Failed to upload ${file.name}`,
        variant: "destructive"
      });
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(uploadFile);
  }, [trustId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'text/plain': ['.txt']
    },
    maxSize: 50 * 1024 * 1024
  });

  const removeFile = (fileId: string) => {
    setUploadingFiles(prev => {
      const updated = new Map(prev);
      updated.delete(fileId);
      return updated;
    });
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive 
            ? 'border-primary bg-primary/10' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-primary">Drop the files here...</p>
        ) : (
          <>
            <p className="text-gray-600">Drag & drop files here, or click to select</p>
            <p className="text-sm text-gray-500 mt-2">
              Supports PDF, Word, Images, and Text files (max 50MB)
            </p>
          </>
        )}
      </div>

      {uploadingFiles.size > 0 && (
        <div className="space-y-2">
          {Array.from(uploadingFiles.entries()).map(([fileId, uploadingFile]) => (
            <div
              key={fileId}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
            >
              <File className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {uploadingFile.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(uploadingFile.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {uploadingFile.status === 'uploading' && (
                  <Progress value={uploadingFile.progress} className="h-1 mt-1" />
                )}
                {uploadingFile.status === 'error' && (
                  <p className="text-xs text-red-600 mt-1">{uploadingFile.error}</p>
                )}
              </div>
              {uploadingFile.status === 'uploading' && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              )}
              {uploadingFile.status === 'success' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {uploadingFile.status === 'error' && (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(fileId)}
                className="p-1 h-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}