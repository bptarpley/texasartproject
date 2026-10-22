// site-wide configuration for talking to the Corpora backend
const TAP = {
    corporaHost: 'https://corpora.library.tamu.edu',
    corpusID: '6328b1338170d921f63fc09d',
    projects: {
        schiwetz: '6851d44033d01c8a93bd0d70',
        dwg: '6851d45633d01c8a93bd0d71',
    },
}

function getTapCorpus(schema, indirectConnections, callback) {
    getCorpus(TAP.corporaHost, TAP.corpusID, schema, indirectConnections, callback)
}
