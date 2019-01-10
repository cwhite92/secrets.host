const serverless = require('serverless-http');
const express = require('express');
const app = express();
const uuidv4 = require('uuid/v4');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const nunjucks = require('nunjucks');

app.use(express.json());
nunjucks.configure('templates', {
    autoescape: true,
    express: app
});

app.get('/', function (req, res) {
    res.render('index.html');
});

app.post('/links', function (req, res) {
    // TODO: ensure public key is valid

    const uuid = uuidv4();
    const publicKey = req.body.public_key;
    const publicKeyPath = 'links/' + uuid + '/public_key.pub';

    s3.putObject({
        Bucket: process.env.S3_BUCKET,
        Key: publicKeyPath,
        Body: publicKey,
        ACL: 'public-read'
    }).promise().then(() => {
        console.log('Successfully wrote public key to S3', publicKeyPath);

        res.json({ uuid: uuid });
    }).catch((error) => {
        console.error('Received error writing public key to S3', error);
    });
});

app.post('/links/:uuid/secrets', function (req, res) {
    // TODO: don't allow secrets to be more than 1MB

    const uuid = req.params.uuid;
    const secrets = req.body.secrets;
    const secretsPath = 'links/' + uuid + '/secrets.txt';

    s3.putObject({
        Bucket: process.env.S3_BUCKET,
        Key: secretsPath,
        Body: secrets,
        ACL: 'public-read'
    }).promise().then(() => {
        console.log('Successfully wrote secrets to S3', secretsPath);

        res.status(201);
        res.send();
    }).catch((error) => {
        console.error('Received error writing secrets to S3', error);
    });
});

app.get('/links/:uuid/secrets', function (req, res) {
    const uuid = req.params.uuid;
    const secretsPath = 'links/' + uuid + '/secrets.txt';

    s3.getObject({
        Bucket: process.env.S3_BUCKET,
        Key: secretsPath
    }).promise().then((data) => {
        console.log('Successfully retrieved secrets from S3', secretsPath);

        res.json({ 'secrets': data.Body.toString('utf-8') });
    }).catch((error) => {
        if (error.code === 'NoSuchKey') {
            res.status(404);
            res.send();
        } else {
            console.error('Received error reading secrets from S3', error);
        }
    });
});

module.exports.handler = serverless(app);
