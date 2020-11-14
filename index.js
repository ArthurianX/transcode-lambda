const { promisify } = require('util')
const fs = require('fs')
const fluentffmpeg = require('fluent-ffmpeg')

const AWS = require('aws-sdk')
const S3 = new AWS.S3()


const convertAnyFileExtensionToMp4 = (name) => {
    let mp4Name = name.split('.')
    mp4Name.splice(mp4Name.length - 1, 1);
    mp4Name.push('mp4')
    mp4Name.join('.')

    return mp4Name;
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

(async function runAll(bucket = 'kind-media-transcoding-input', name = 'timelapse.mp4', amount = 1, fps = 6)
{
    const srcBucket = 'kind-media-transcoding-input';
    const destBucket = 'kind-media-transcoding-output';
    const srcKey    = 'Depoimentos.mp4';

    // transcodeVideo({name: srcKey})

    fetchUploadedVideo({bucket: srcBucket, name: srcKey})
        .then(() => transcodeVideo({name: srcKey}))
        .then(() => saveTranscodedFileToS3({bucket: destBucket, name: `TRANSCODED-${}`}))
        .then((data) => console.log(null, {success: true, data, bucket: destBucket, name: `TRANSCODED-${srcKey}`}))
        .catch(err => { console.log(err) })
})()
