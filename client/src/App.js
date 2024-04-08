import './App.css';
import { useState } from "react";
import AWS from 'aws-sdk';
import { nanoid } from 'nanoid'


// Configure AWS credentials and S3 bucket details
AWS.config.update({
  accessKeyId: process.env.REACT_APP_accessKeyId,
  secretAccessKey: process.env.REACT_APP_secretAccessKey,
  region: process.env.REACT_APP_region,
});

const S3 = new AWS.S3();
const BUCKET_NAME = process.env.REACT_APP_BUCKET_NAME;
const API_GATEWAY_KEY = process.env.REACT_APP_API_GATEWAY_KEY;
const API_GATEWAY_URL = process.env.REACT_APP_API_GATEWAY_URL + API_GATEWAY_KEY;

function App() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');

  async function handleUpload() {
    if (!file) {
      return;
    }

    try {
      // Upload the file to S3
      const s3Params = {
        Bucket: BUCKET_NAME,
        Key: file.name,
        Body: file,
      };
      await S3.upload(s3Params).promise();

      console.log(s3Params);

      // Send the file details to the API Gateway endpoint
      const apiParams = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': API_GATEWAY_KEY,

        },
        body: JSON.stringify({
          "TableName": process.env.REACT_APP_TableName,
          "Item": {
            id: nanoid(),
            input_text: fileName,
            input_file_path: BUCKET_NAME + "/" + file.name
          }
        }),
      };
      console.log(apiParams);
      await fetch(API_GATEWAY_URL, apiParams);

      alert(`File "${file.name}" uploaded successfully to S3 bucket and stored in DynamoDB.`);
    } catch (error) {
      console.error('Error uploading file and storing in DynamoDB:', error);
      alert('Failed to upload file.');
    }
  }


  return (
      <div className="App">
        <div className="Form">
          <div>
            <label htmlFor="textInput">Text Input: </label>
            <input className="textInput" value={fileName} onChange={(e) => setFileName(e.target.value)} type="text" />
          </div>
          <div>
            <label htmlFor="textInput">File Input: </label>
            <input className="fileInput" onChange={(e) => setFile(e.target.files[0])} type="file" accept=".txt" />
          </div>
          <button onClick={handleUpload}>Submit</button>
        </div>
      </div>
  );
}

export default App;
