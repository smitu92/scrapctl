import { useState } from "react";

export default function Uploadfile() {
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onloadend = () => {
            // This is the Base64 string of your file
            const base64String = reader.result;

            // Save to browser
            localStorage.setItem('userFile', base64String);
            alert("File saved to browser!");
        };

        if (file) {
            reader.readAsDataURL(file); // Reads the file as a data URL
        }
    };

    return (<>
        <h1>hello upload ur file</h1>
        <input type="file" onChange={handleFileUpload} />
    </>)




}