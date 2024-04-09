import './App.css';
import { useState, useEffect } from "react";
import AWS from 'aws-sdk';
import { nanoid } from 'nanoid'
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

function App() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    async function configureAWS() {
      try {
        const client = new SecretsManagerClient();
        const accessKeyId = await client.send(new GetSecretValueCommand({ SecretId: 'secret_access_key' }));
        const secretAccessKey = await client.send(new GetSecretValueCommand({ SecretId: 'access_key_id' }));

        console.log(accessKeyId);
        console.log(secretAccessKey);
        AWS.config.update({
          accessKeyId: accessKeyId.SecretString,
          secretAccessKey: secretAccessKey.SecretString,
          region: process.env.REACT_APP_REGION,
        });

        console.log('AWS SDK configured successfully');
      } catch (error) {
        console.error('Error configuring AWS SDK:', error);
      }
    }
    configureAWS();
  }, []);

  async function handleUpload() {
    if (!file) {
      return;
    }

    try {
      // Upload the file to S3
      const s3 = new AWS.S3();
      const s3Params = {
        Bucket: process.env.REACT_APP_BUCKET_NAME,
        Key: file.name,
        Body: file,
      };
      await s3.upload(s3Params).promise();

      // Send the file details to the API Gateway endpoint
      const apiParams = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': process.env.REACT_APP_API_GATEWAY_KEY,
        },
        body: JSON.stringify({
          "TableName": process.env.REACT_APP_TableName,
          "Item": {
            id: nanoid(),
            input_text: fileName,
            input_file_path: `${process.env.REACT_APP_BUCKET_NAME}/${file.name}`
          }
        }),
      };
      await fetch(process.env.REACT_APP_API_GATEWAY_URL, apiParams);

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
