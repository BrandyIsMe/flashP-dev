'use strict';

const axios = require('axios')
const urljonin = require('url-join')
const semver = require('semver')

module.exports = {
    getNpminfo,
    getNpmVersions,
    getNpmSemverVersion,
    getDefaultRegistry,
    getNpmLatestVersion
};

function getNpminfo(npmName, registry) {
    if (!npmName) {
        return null
    }

    const registryUrl = registry ||  getDefaultRegistry()
    const npmInfoUrl = urljonin(registryUrl, npmName)

    return axios.get(npmInfoUrl).then((response) =>{
        if (response.status === 200) {
            return response.data
        }

        return null
    }).catch((err) => Promise.reject(err))
}

function getDefaultRegistry(isOriginal = true) {
    return isOriginal ? 'https://registry.npmjs.org' : 'http://registry.npm.taobao.org';
}


async function getNpmVersions(npmName, registry) {
 const data =   await getNpminfo(npmName, registry)
 if (data) {
    return Object.keys(data.versions)
 }else{
     return []
 }
}

function getNpmSemverVersions(baseVersion, versions) {
    return versions.filter(version => semver.satisfies(version, `^${baseVersion}`)).sort((a , b)=> semver.gt(b, a))
}

async function getNpmSemverVersion(npmName, baseVersion, registry) {
    const versions = await getNpmVersions(npmName, registry)
    const newVersions =  getNpmSemverVersions(baseVersion, versions)
    if (newVersions && newVersions.length > 0) {
        return newVersions[0]
    }
}

async function getNpmLatestVersion(npmName, registry) {
    let versions = await getNpmVersions(npmName, registry)
    if (versions) {
        return versions.sort((a, b) => semver.gt(b, a)? 1 : -1)[0]
    }

    return null
}

