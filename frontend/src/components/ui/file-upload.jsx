import { cn } from "@/lib/utils";
import React, { useRef, useState } from "react";
import { motion } from "motion/react";
import { IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";

const mainVariant = {
   initial: {
      x: 0,
      y: 0,
   },
   animate: {
      x: 20,
      y: -20,
      opacity: 0.9,
   },
};

const secondaryVariant = {
   initial: {
      opacity: 0,
   },
   animate: {
      opacity: 1,
   },
};

export const FileUpload = ({
   onChange // This is the prop the parent (Modal) uses to track file selection
}) => {
   // Use internal state for display purposes only
   const [localFiles, setLocalFiles] = useState([]);
   const fileInputRef = useRef(null);

   const handleFileChange = (newFiles) => {
      // Update local state to display the file card
      setLocalFiles(newFiles); 
      
      // Notify the parent component that a file has been selected
      onChange && onChange(newFiles);
   };

   const handleClick = () => {
      fileInputRef.current?.click();
   };

   const { getRootProps, isDragActive } = useDropzone({
      multiple: false,
      noClick: true,
      onDrop: handleFileChange,
      onDropRejected: (error) => {
         console.log(error);
      },
   });

   return (
      <div className="w-full" {...getRootProps()}>
         <motion.div
            onClick={handleClick}
            whileHover="animate"
            // Dark theme styling: removed overflow-hidden, set dark background/border
            className="p-10 group/file block rounded-lg cursor-pointer w-full relative bg-zinc-800 border border-zinc-700/50 hover:border-sky-500/50 transition-colors duration-200"> 
            <input
               ref={fileInputRef}
               id="file-upload-handle"
               type="file"
               onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
               className="hidden" />
            
            {/* REMOVED GridPattern and its wrapping div */}

            <div className="flex flex-col items-center justify-center">
               <p
                  // Adjusted text color
                  className="relative z-20 font-sans font-bold text-white text-base">
                  Upload file
               </p>
               <p
                  // Adjusted text color
                  className="relative z-20 font-sans font-normal text-neutral-400 text-sm mt-2">
                  Drag or drop your files here or click to upload
               </p>
               <div className="relative w-full mt-10 max-w-xl mx-auto">
                  {localFiles.length > 0 &&
                     localFiles.map((file, idx) => (
                        <motion.div
                           key={"file" + idx}
                           layoutId={idx === 0 ? "file-upload" : "file-upload-" + idx}
                           className={cn(
                              // Dark theme file card styling
                              "relative overflow-hidden z-40 bg-zinc-900 flex flex-col items-start justify-start md:h-24 p-4 mt-4 w-full mx-auto rounded-md",
                              "shadow-sm border border-zinc-700"
                           )}>
                           <div className="flex justify-between w-full items-center gap-4">
                              <motion.p
                                 initial={{ opacity: 0 }}
                                 animate={{ opacity: 1 }}
                                 layout
                                 className="text-base text-white truncate max-w-xs">
                                 {file.name}
                              </motion.p>
                              <motion.p
                                 initial={{ opacity: 0 }}
                                 animate={{ opacity: 1 }}
                                 layout
                                 className="rounded-lg px-2 py-1 w-fit shrink-0 text-sm bg-neutral-800 text-white shadow-input">
                                 {(file.size / (1024 * 1024)).toFixed(2)} MB
                              </motion.p>
                           </div>

                           <div
                              className="flex text-sm md:flex-row flex-col items-start md:items-center w-full mt-2 justify-between text-neutral-400">
                              <motion.p
                                 initial={{ opacity: 0 }}
                                 animate={{ opacity: 1 }}
                                 layout
                                 className="px-1 py-0.5 rounded-md bg-neutral-800 ">
                                 {file.type}
                              </motion.p>

                              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout>
                                 modified{" "}
                                 {new Date(file.lastModified).toLocaleDateString()}
                              </motion.p>
                           </div>
                        </motion.div>
                     ))}
                  {!localFiles.length && (
                     <motion.div
                        layoutId="file-upload"
                        variants={mainVariant}
                        transition={{
                           type: "spring",
                           stiffness: 300,
                           damping: 20,
                        }}
                        className={cn(
                           // Dark theme empty card styling
                           "relative group-hover/file:shadow-2xl z-40 bg-zinc-900 flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md",
                           "shadow-[0px_10px_50px_rgba(0,0,0,0.1)] border border-white/50"
                        )}>
                        {isDragActive ? (
                           <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-white flex flex-col items-center">
                              Drop it
                              <IconUpload className="h-4 w-4 text-white" />
                           </motion.p>
                        ) : (
                           <IconUpload className="h-4 w-4 text-white" />
                        )}
                     </motion.div>
                  )}

                  {!localFiles.length && (
                     <motion.div
                        variants={secondaryVariant}
                        className="absolute opacity-0 border border-dashed border-sky-400 inset-0 z-30 bg-transparent flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md"></motion.div>
                  )}
               </div>
            </div>
         </motion.div>
      </div>
   );
};
// GridPattern function is removed from this file.