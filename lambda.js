'use strict'

const {promisify} = require('util')
const fs = require('fs')
const fluentffmpeg = require('fluent-ffmpeg')

const AWS = require('aws-sdk')
const S3 = new AWS.S3()

const convertAnyFileExtensionToMp4 = (name) => {
    let mp4Name = name.split('.')
    mp4Name.splice(mp4Name.length - 1, 1);
    mp4Name.push('mp4')

    return mp4Name.join('.');
}

function fetchUploadedVideo({bucket, name} = {}, {listObjects = promisify(S3.listObjects).bind(S3), getObject = promisify(S3.getObject).bind(S3), writeFile = promisify(fs.writeFile).bind(fs)} = {}) {
    const params = { Bucket: bucket, Key: name };
    return S3.getObject(params).promise().then((gotFile) => {
        return writeFile(`/tmp/${name}`, gotFile.Body)
    });
}

function transcodeVideo({name} = {}, {ffmpeg = fluentffmpeg} = {}) {
    return new Promise((resolve, reject) => {
        ffmpeg(`/tmp/${name}`)
            .outputOptions(['-pix_fmt yuv420p', '-profile:v baseline', '-level 3', '-movflags +faststart'])
            .audioCodec('aac')
            .videoCodec('libx264')
            .format('mp4')
            .on('error', (err) => {
                console.error('Error during processing', err);
                reject(err)
            })
            .on('end', () => {
                console.log('Processing finished !');
                resolve()
            })
            .save(`/tmp/${convertAnyFileExtensionToMp4(name)}`, {end: true})
    })
}

function saveTranscodedFileToS3({bucket, name}) {
    const params = {Body: fs.readFileSync(`/tmp/${name}`), Bucket: bucket, Key: name};
    return S3.putObject(params).promise();
}

exports.handler = (event, context, cb) => {
    // const srcBucket = event.Records[0].s3.bucket.name;
    const srcBucket = 'kind-media-transcoding-input';
    const destBucket = 'kind-media-transcoding-output';
    // Name needs to be escaped before file upload, .replace(/\+/g, " ")
    let srcKey;

    if (event.Records == undefined) {
        // Demo mode, test lambda local
        srcKey = 'Depoimentos.mp4';
    } else {
        srcKey = decodeURIComponent(event.Records[0].s3.object.key);
    }


    fetchUploadedVideo({bucket: srcBucket, name: srcKey})
        .then(() => transcodeVideo({name: srcKey}))
        .then(() => saveTranscodedFileToS3({bucket: destBucket, name: `${convertAnyFileExtensionToMp4(srcKey)}`}))
        .then((data) => cb(null, {success: true, data, bucket: destBucket, name: convertAnyFileExtensionToMp4(srcKey)}))
        .catch(err => cb(err))
}
