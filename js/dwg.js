// shared data setup and faceting for the Dallas Women's Gallery ephemera database

// the ephemera database shows Documents (ephemera) and ArtWorks, keyed by "<content type>-<id>" since they share
// one grid. each is placed in the order of the events (exhibits) they're associated with
const dwgEphemeraSchema = {
    Event: {
        preload: true,
        sortFields: ['+timespan.start'],
        criteria: {
            'f_project.id': TAP.projects.dwg,
            'e_timespan.start': 'y',
            only: 'id,label,year,agents.id,agents.label,artifacts.id',
        }
    },
    Document: {
        preload: true,
        criteria: {
            'f_project.id': TAP.projects.dwg,
            only: 'id,agents.id,agents.label,associated_artworks.id,collection,media_type,themes',
        }
    },
    ArtWork: {
        preload: true,
        criteria: {
            'f_project.id': TAP.projects.dwg,
            'e_iiif_uri': 'y',
            only: 'id,artists.id,artists.label,iiif_uri',
        }
    },
}

function getDwgEphemeraCorpus(callback) {
    getTapCorpus(dwgEphemeraSchema, [], callback)
}

// facet categories keep the plugin's names, since links from the ephemera detail page use them
// (i.e. dwg/ephemera/?facet=agents&value=<id>)
const dwgFacets = {
    years: {label: 'Year', sortByLabel: false},
    agents: {label: 'Person'},
    collections: {label: 'Collection'},
    exhibits: {label: 'Event', sortByLabel: false},
    media: {label: 'Media'},
    themes: {label: 'Theme'},
}

// aggregate facet values from the corpus into an ArtMenu, returning the artifact keys in display order
function collectEphemeraFacets(corpus, menu) {
    let artifactKeys = new Set()
    let documentKey = id => `Document-${id}`
    let artworkKey = id => `ArtWork-${id}`
    let documentIDs = corpus.schema['Document'].ids
    let artworkIDs = corpus.schema['ArtWork'].ids

    // events determine which artifacts appear, and in what order. an event's year and people apply to its
    // documents, and a document's associated artworks are shown alongside it
    corpus.getContents('Event').forEach(event => {
        let eventDocumentKeys = []

        if (event.artifacts) event.artifacts.forEach(stub => {
            if (!documentIDs.has(stub.id)) return
            let document = corpus.getContent('Document', stub.id)
            let keys = [documentKey(document.id)]
            eventDocumentKeys.push(keys[0])

            if (document.associated_artworks) document.associated_artworks.forEach(artworkStub => {
                if (artworkIDs.has(artworkStub.id)) keys.push(artworkKey(artworkStub.id))
            })

            keys.forEach(key => {
                artifactKeys.add(key)
                menu.addFacet('exhibits', event.id, event.label, key)
                if (event.year) menu.addFacet('years', event.year, event.year.toString(), key)
            })
        })

        if (event.agents) event.agents.forEach(agent => {
            eventDocumentKeys.forEach(key => menu.addFacet('agents', agent.id, agent.label, key))
        })
    })

    let artworkMedia = null
    corpus.getContents('Document').forEach(document => {
        let key = documentKey(document.id)
        if (!artifactKeys.has(key)) return

        if (document.agents) document.agents.forEach(agent => menu.addFacet('agents', agent.id, agent.label, key))
        if (document.collection) menu.addFacet('collections', document.collection.id, document.collection.label, key)
        if (document.media_type) {
            menu.addFacet('media', document.media_type.id, document.media_type.label, key)
            if (document.media_type.label === 'Artwork') artworkMedia = document.media_type
        }
        if (document.themes) document.themes.forEach(theme => menu.addFacet('themes', theme.id, theme.label, key))
    })

    corpus.getContents('ArtWork').forEach(artwork => {
        let key = artworkKey(artwork.id)
        if (!artifactKeys.has(key)) return

        if (artwork.artists) artwork.artists.forEach(artist => menu.addFacet('agents', artist.id, artist.label, key))
        // artworks don't have a media type of their own, so file them all under "Artwork"
        if (artworkMedia) menu.addFacet('media', artworkMedia.id, artworkMedia.label, key)
    })

    return [...artifactKeys]
}

// square thumbnails for each artifact, linking to its detail page. cells are created once and shown or hidden
// as filters change; images load as they scroll into view
class EphemeraGrid {
    constructor(element, corpus, artifactKeys) {
        this.element = element
        this.corpus = corpus
        this.artifactKeys = artifactKeys

        this.imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
                    this.imageObserver.unobserve(entry.target)
                    this.loadImage(entry.target)
                }
            })
        }, {threshold: 0.3})

        artifactKeys.forEach(artifactKey => {
            let [contentType, id] = artifactKey.split('-')
            let detailURL = contentType === 'ArtWork'
                ? `${window.rootPath}artwork/?id=${id}&filters=off`
                : `${window.rootPath}ephemera-detail/?id=${id}`

            appendToEl(this.element, `
                <div id="tap-ephemera-cell-${artifactKey}" class="col-md-4 tap-artgrid-cell tap-ephemera-cell">
                    <a href="${detailURL}" target="_blank">
                        <img
                            src="${window.rootPath}img/image-loading.svg"
                            class="tap-artgrid-img"
                            data-artifact-key="${artifactKey}"
                            alt=""
                        />
                    </a>
                </div>
            `)
            this.imageObserver.observe(getEl(`tap-ephemera-cell-${artifactKey}`).querySelector('img'))
        })
    }

    show(visibleArtifactKeys) {
        this.artifactKeys.forEach(artifactKey => {
            getEl(`tap-ephemera-cell-${artifactKey}`).classList.toggle('d-none', !visibleArtifactKeys.has(artifactKey))
        })
    }

    loadImage(img) {
        let [contentType, id] = img.dataset.artifactKey.split('-')
        let imgRect = img.getBoundingClientRect()
        let targetWidth = parseInt(imgRect.width)
        let targetHeight = parseInt(imgRect.height)

        if (contentType === 'Document') {
            // a document's images are its pages, which aren't included in listings. (Corpora errors on
            // only=pages by itself, hence the uri)
            fetch(`${this.corpus.api}/Document/${id}/?only=pages,uri`)
                .then(res => res.json())
                .then(document => {
                    let firstPage = document.pages && document.pages['1']
                    let fileKeys = firstPage && firstPage.files ? Object.keys(firstPage.files) : []
                    if (fileKeys.length) {
                        let file = firstPage.files[fileKeys[0]]
                        this.showImage(img, `${TAP.corporaHost}/iiif/2${file.path}`, file.width, file.height, targetWidth, targetHeight)
                    }
                })
        } else {
            let artwork = this.corpus.getContent('ArtWork', id)
            fetch(`${artwork.iiif_uri}/info.json`)
                .then(res => res.json())
                .then(info => this.showImage(img, artwork.iiif_uri, info.width, info.height, targetWidth, targetHeight))
        }
    }

    // request a square from the image's top left corner, scaled down to the cell's size
    showImage(img, iiifIdentifier, width, height, targetWidth, targetHeight) {
        let src = `${iiifIdentifier}/full/max/0/default.png`

        if (width > height) {
            if (height > targetHeight) src = `${iiifIdentifier}/0,0,${height},${height}/,${targetHeight}/0/default.png`
        } else if (width > targetWidth) {
            src = `${iiifIdentifier}/0,0,${width},${width}/${targetWidth},/0/default.png`
        }

        img.setAttribute('src', src)
    }
}
