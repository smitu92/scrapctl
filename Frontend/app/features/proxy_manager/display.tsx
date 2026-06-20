import { useState, useEffect } from 'react';

export default function FileDisplay() {
    const [fileData, setFileData] = useState(null);

    useEffect(() => {
        // 1. Retrieve the string from storage
        const savedFile = localStorage.getItem('userFile');
        if (savedFile) {
            setFileData(savedFile);
        }
    }, []);

    if (!fileData) return <p>No file saved in browser yet.</p>;

    return (
        <div>
            <h3>Your Saved File:</h3>

            {/* If it's an image, just put it in an <img> tag */}
            <img src={fileData} alt="Preview" style={{ width: '300px' }} />

            {/* If it's a PDF or Doc, provide a download link */}
            <br />
            <a href={fileData} download="my-saved-file">
                Download/Open File
            </a>
        </div>
    );
}
