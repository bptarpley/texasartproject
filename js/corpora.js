// for getting/manipulating DOM
function getEl(id) { return document.getElementById(id) }
function getElWithQuery(query) { return document.querySelector(query) }
function getElsWithQuery(query) { return document.querySelectorAll(query) }
function forElsMatching(query, callback) { [].forEach.call(document.querySelectorAll(query), callback) }
function clearEl(el) { while (el.firstChild) el.removeChild(el.firstChild) }
function appendToEl(el, html) {
    el.append(htmlToEl(html))
}
function prependToEl(el, html) {
    el.prepend(htmlToEl(html))
}
function htmlToEl(html) {
    let docFrag = document.createDocumentFragment()
    let range = document.createRange()
    range.setStart(docFrag, 0)
    docFrag.appendChild(range.createContextualFragment(html))
    return docFrag
}
const hideEl = (el) => el.classList.add('hidden')
const showEl = (el) => el.classList.remove('hidden')
function getCssVar(variableName) {
    return getComputedStyle(document.documentElement).getPropertyValue(`--${variableName}`)
}
function setCssVar(variableName, value) {
    document.documentElement.style.setProperty(variableName, value)
}

// iiif image functions
function injectImageInfo(img, callback) {
    fetch(`${img.dataset.iiifIdentifier}/info.json`)
        .then(res => res.json())
        .then(info => {
            img.dataset.fullwidth = info.width
            img.dataset.fullheight = info.height
            if (!img.dataset.region)
                img.dataset.region = `${parseInt(info.width / 2) - 100},${parseInt(info.height / 2) - 100},200,200`
            callback()
        })
}
function renderImage(img, size, region_only=true) {
    let iiif_src = null
    let width = parseInt(size)
    let height = parseInt(size)

    if (img.dataset.displayRestriction === 'No Image') {
        iiif_src = `${window.rootPath}img/image-unavailable.png`
        if (!region_only) {
            width = 200
            height = 200
        }
    } else {
        if (img.dataset.displayRestriction === 'Thumbnail Only' && !region_only) {
            region_only = true
            width = 200
            height = 200
        }

        if (region_only) {
            iiif_src = `${img.dataset.iiifIdentifier}/${img.dataset.region}/${size},${size}/0/default.png`
        } else {
            if (width > img.dataset.fullwidth) width = img.dataset.fullwidth
            iiif_src = `${img.dataset.iiifIdentifier}/full/${width},/0/default.png`
            let ratio = width / img.dataset.fullwidth
            height = parseInt(ratio * img.dataset.fullheight)
            img.style.filter = 'brightness(2)'
            img.onload = () => {
                img.style.filter = 'brightness(1.1)'
            }
        }
    }

    img.setAttribute('src', iiif_src)
    img.style.width = `${width}px`
    img.style.height = `${height}px`
    img.dataset.loaded = 'true'
}

// artwork metadata
function renderArtworkMetadata(artwork, style='vertical', filterLinks=true) {
    if (style === 'vertical') {
        return `
              <dl>
                ${artwork.year ? `<dt>Year:</dt><dd>${artwork.year}</dd>` : ''}
                ${artwork.collection && !artwork.anonymize_collector ? `<dt>Collection:</dt><dd>${artwork.collection.label}</dd>` : ''}
                ${artwork.anonymize_collector ? `<dt>Collection:</dt><dd>Private Collection</dd>` : ''}
                <dt>Medium:</dt><dd>${artwork.medium}</dd>
                <dt>Surface:</dt><dd>${artwork.surface}</dd>
                ${artwork.size_inches ? `<dt>Size:</dt><dd>${artwork.size_inches}</dd>` : ''}
              </dl>
              <a class="mt-2" href="${window.rootPath}artwork/?id=${artwork.id}" target="_blank">See more...</a>
            `
    } else if (style === 'horizontal') {
        return `
                <div class="row">
                  <div class="col-md-6">
                    <dl>
                      ${artwork.year ? `<dt>Year:</dt><dd>${artwork.year}</dd>` : ''}
                      <dt>Medium:</dt><dd>${artwork.medium}</dd>
                      <dt>Surface:</dt><dd>${artwork.surface}</dd>
                    </dl>
                  </div>
                  <div class="col-md-6 d-flex flex-column">
                    <dl style="flex: 1;">
                      ${artwork.collection && !artwork.anonymize_collector ? `<dt>Collection:</dt><dd>${artwork.collection.label}</dd>` : ''}
                      ${artwork.anonymize_collector ? `<dt>Collection:</dt><dd>Private Collection</dd>` : ''}
                      ${artwork.size_inches ? `<dt>Size:</dt><dd>${artwork.size_inches}</dd>` : ''}
                    </dl>
                    <div class="w-100 text-end">
                      <a href="${window.rootPath}artwork/?id=${artwork.id}" target="_blank">See more...</a>
                    </div>
                  </div>
                </div>
            `
    } else if (style === 'full') {
        let tags = []
        artwork.tags.forEach(tag => {
            let [key, value] = tag.label.split(': ')
            tags.push(`<dt>${key}:</dt><dd>${value}</dd>`)
        })

        let exhibits = []
        artwork.exhibits.forEach(exhibit => {
            exhibits.push(`<p>${exhibit.label}</p>`)
        })

        let prizes = []
        artwork.prizes.forEach(prize => {
            prizes.push(`<p><i>${prize.name}</i>${prize.exhibit ? ` awarded at ${prize.exhibit}` : ''}</p>`)
        })

        return `
                <dl>
                  ${artwork.caption ? `<dt>Caption:</dt><dd>${artwork.caption}</dd>` : ''}
                  ${artwork.alt_title ? `<dt>Alternate Title</dt><dd>${artwork.alt_title}</dd>` : ''}
                  <dt>Creator:</dt><dd>${artwork.artists[0].label}</dd>
                  ${artwork.year ? `<dt>Year:</dt><dd>${artwork.year}</dd>` : ''}
                  ${artwork.location ? `<dt>Depicted Place:</dt><dd>${filterLinks ? `<a href="${window.rootPath}schiwetz/?place=${artwork.location.id}">` : ''}${artwork.location.label}${filterLinks ? `</a>` : ''}</dd>` : ''}
                  ${artwork.edition ? `<dt>Edition</dt><dd>${artwork.edition}</dd>` : ''}
                  ${tags.join('\n')}
                  ${artwork.medium ? `<dt>Medium:</dt><dd>${filterLinks ? `<a href="${window.rootPath}schiwetz/?medium=${encodeURIComponent(artwork.medium)}">` : ''}${artwork.medium}${filterLinks ? '</a>' : ''}</dd>` : ''}
                  ${artwork.surface ? `<dt>Surface:</dt><dd>${filterLinks ? `<a href="${window.rootPath}schiwetz/?surface=${encodeURIComponent(artwork.surface)}">` : ''}${artwork.surface}${filterLinks ? '</a>' : ''}</dd>` : ''}
                  ${artwork.size_inches ? `<dt>Size:</dt><dd>${artwork.size_inches}</dd>` : ''}
                  ${artwork.inscriptions ? `<dt>Inscriptions</dt><dd>${artwork.inscriptions}</dd>` : ''}
                  ${artwork.collection && !artwork.anonymize_collector ? `<dt>Collection:</dt><dd>${filterLinks ? `<a href="${window.rootPath}schiwetz/?collection=${artwork.collection.label.startsWith('Private Collection') ? 'Private%20Collection' : artwork.collection.id}">` : ''}${artwork.collection.label}${filterLinks ? '</a>' : ''}</dd>` : ''}
                  ${artwork.anonymize_collector ? `<dt>Collection:</dt><dd>${filterLinks ? `<a href="${window.rootPath}schiwetz/?collection=Private%20Collection">` : ''}Private Collection${filterLinks ? '</a>' : ''}</dd>` : ''}
                </dl>
                
                ${exhibits.length ? `
                    <h2>Exhibits</h2>
                    ${exhibits.join('\n')}
                ` : ''}
                
                ${prizes.length ? `
                    <h2>Prizes</h2>
                    ${prizes.join('\n')}
                ` : ''}
            `
    }
}

// basic utility functions
function callAPI(url, params={}, callback) {
    let fetchURL = url
    let getParams = buildGetParams(params)
    if (getParams) fetchURL += `?${getParams}`
    fetch(fetchURL)
        .then(res => res.json())
        .then(data => callback(data))
}
function buildGetParams(params) {
    let getParams = ''
    if (Object.keys(params).length) {
        let paramStrings = []
        for (let param in params) {
            paramStrings.push(`${param}=${params[param]}`)
        }
        getParams += paramStrings.join('&')
    }
    return getParams
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function romanize (num) {
    if (isNaN(num))
        return num;
    let digits = String(+num).split(""),
        key = ["","C","CC","CCC","CD","D","DC","DCC","DCCC","CM",
            "","X","XX","XXX","XL","L","LX","LXX","LXXX","XC",
            "","I","II","III","IV","V","VI","VII","VIII","IX"],
        roman = "",
        i = 3;
    while (i--)
        roman = (key[+digits.pop() + (i * 10)] || "") + roman;
    return Array(+digits.join("") + 1).join("M") + roman;
}
function escapeAttrVal(val) {
    return val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function hasProp(obj, path) {
    return path.split(".").every(function(x) {
        if(typeof obj != "object" || obj === null || ! x in obj)
            return false
        obj = obj[x]
        return true
    })
}
function distillHTML(htmlString) {
    let stylisticTags = ['em', 'p', ]
    let tagTransforms = {
        'i': 'em'
    }

    // strip out all tag attributes. we want just simple tags
    htmlString = htmlString.replace(/<(\/?)([\w-]+)[^>]*>/g, function(match, slash, tagName) {
        return '<' + slash + tagName + '>'
    })

    Object.keys(tagTransforms).forEach(tag => {
        htmlString = htmlString.replaceAll(`<${tag}>`, `<${tagTransforms[tag]}>`)
        htmlString = htmlString.replaceAll(`</${tag}>`, `</${tagTransforms[tag]}>`)
    })

    let tagsAndText = getTagsAndText(htmlString)

    tagsAndText.opened_tags.forEach(tag => {
        if (!stylisticTags.includes(tag)) htmlString = htmlString.replaceAll(`<${tag}>`, '')
    })
    tagsAndText.closed_tags.forEach(tag => {
        if (!stylisticTags.includes(tag)) htmlString = htmlString.replaceAll(`</${tag}>`, '')
    })

    return htmlString
}
function getTagsAndText(input) {
    // Return empty result for empty or non-string input
    if (!input || typeof input !== 'string') {
        return { opened_tags: [], closed_tags: [], text: '' }
    }

    // Find all opening HTML tags in the string
    const openTagRegex = /<\s*([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g
    const openTagMatches = [...input.matchAll(openTagRegex)]
    const openedTags = openTagMatches.map(match => match[1])

    // Find all closing HTML tags in the string
    const closeTagRegex = /<\s*\/\s*([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g
    const closeTagMatches = [...input.matchAll(closeTagRegex)]
    const closedTags = closeTagMatches.map(match => match[1])

    // Extract text content by removing HTML tags
    const text = input.replace(/<\/?[^>]+(>|$)/g, '')

    return {
        opened_tags: openedTags, // Remove duplicates
        closed_tags: closedTags, // Remove duplicates
        text: text
    }
}
function delayedScroll(anchor, smooth=true, parent=null) {
    let scrollOpts = {behavior: 'smooth'}
    if (!smooth) scrollOpts = null

    let idSelectedEl = getElWithQuery(`${parent ? '#' + parent + ' ' : ''}#${anchor}`)
    if (idSelectedEl) idSelectedEl.scrollIntoView(scrollOpts)
    else {
        let anchorSelectedEl = getElWithQuery(`${parent ? '#' + parent + ' ' : ''}a[name=${anchor}]`)
        if (anchorSelectedEl) anchorSelectedEl.scrollIntoView(scrollOpts)
    }
}
function parseDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    })
}
function forEachKey(obj, callback) {
    Object.keys(obj).forEach(key => callback(key))
}


class Corpus {
    constructor(host, id, schema={}, indirectConnections=[]) {
        this.host = host
        this.id = id
        this.api = `${host}/api/corpus/${id}`
        this.content = {}

        /* example schema
        {
            Book: {
                preload: true,                  // <- whether to pull down all content of this type on load
                xRefs: [                        // <- any cross-references to track internally
                    {field: 'authors', reference: 'Person', multi: true},
                    {field: 'genre', reference: 'Genre', multi: true}
                ],
                sortFields: ['+title'],             // <- field to sort by when pulling down content
                criteria: {f_project_id: 42},   // <- any filtering criteria to use when pulling down content
            },
            Person: {
                preload: true,
                sortFields: ['+last_name', '+first_name']
            },
            Genre: {
                preload: true,
                sortFields: ['+name']
            }
        }
        */
        this.schema = Object.assign({}, schema)
        forEachKey(this.schema,contentType => {
            if (!this.schema[contentType].hasOwnProperty('preload')) this.schema[contentType].preload = false
            if (!this.schema[contentType].hasOwnProperty('xRefs')) this.schema[contentType].xRefs = []
            if (!this.schema[contentType].hasOwnProperty('sortFields')) this.schema[contentType].sortFields = []
            this.schema[contentType].ids = new Set()
        })

        /* example indirect connections
        [
            ['Person', 'Book', 'Genre']         // <- this would instruct corpus logic to register indirect connections
                                                //    between people and genres so you could query all genres related
                                                //    to a specific author
        ]
        */
        this.indirectConnections = indirectConnections
    }

    async load(callback, useCache=true) {
        // grab data and populate content
        let apiRequests = []
        for (let contentType in this.schema) {
            if (this.schema[contentType].preload) {
                let criteria = Object.assign({}, this.schema[contentType].criteria, {
                    'page-size': 10000,
                })

                this.schema[contentType].sortFields.forEach(sortField => {
                    let direction = 'asc'
                    if (sortField.startsWith('-')) direction = 'desc'
                    sortField = sortField.replace('+', '').replace('-', '')
                    criteria[`s_${sortField}`] = direction
                })

                apiRequests.push({
                    contentType,
                    url: `${this.api}/${contentType}/?${buildGetParams(criteria)}`
                })
            }
        }

        const db = await this.#openDB()

        let results = await Promise.all(apiRequests.map(async ({ contentType, url }) => {
            // Kick off the cache read and last-updated check in parallel
            const cachedRecordPromise = db ? this.#dbGet(db, url) : Promise.resolve(null)
            const lastUpdatedPromise = fetch(`${this.api}/${contentType}/last-updated/`).then(r => r.json())
            const [cachedRecord, lastUpdatedResponse] = await Promise.all([cachedRecordPromise, lastUpdatedPromise])

            // Serve from cache if it exists and is still fresh
            const cacheIsValid = cachedRecord && cachedRecord.last_updated >= lastUpdatedResponse.last_updated
            if (db && useCache && cacheIsValid) return cachedRecord.data

            // Cache is stale or bypassed -- fetch fresh data from the API
            const response = await fetch(url)
            const data = await response.json()

            // Store fresh data in the cache for next time (non-blocking)
            if (db) this.#dbPut(db, url, { last_updated: lastUpdatedResponse.last_updated, data }).catch(err => console.warn(`Failed to cache ${contentType}:`, err))

            return data
        }))
        results.forEach(result => {
            if (result.meta && result.records) {
                let contentType = result.meta.content_type
                if (!(contentType in this.content)) this.content[contentType] = {}

                result.records.forEach(record => {
                    this.schema[contentType].ids.add(record.id)
                    this.content[contentType][record.id] = record
                    this.content[contentType][record.id]['contentType'] = contentType
                    this.content[contentType][record.id]['_conns'] = {}
                })
            }
        })

        // wire up any xrefs
        forEachKey(this.schema, contentType => {
            if (this.schema[contentType].preload) {
                let contents = this.getContents(contentType)
                contents.forEach(content => {
                    this.registerConnections(content)
                })
            }
        })

        // wire up indirect connections
        this.registerIndirectConnections()

        callback(this)
    }

    getContent(contentType, id) {
        // for content that gets fully loaded because it's a facet
        if (contentType in this.content) {
            if (id in this.content[contentType]) return this.content[contentType][id]
        }

        // for content that isn't preloaded but should be interlinked anyway
        if (contentType in this.schema) {
            if (!this.schema[contentType].preload) {
                if (!(contentType in this.content)) this.content[contentType] = {}
                this.content[contentType][id] = {
                    id: id,
                    contentType: contentType,
                    label: contentType,
                    _conns: {}
                }
            }

            return this.content[contentType][id]
        }

        return null
    }

    getContents(contentType) {
        let results = []
        if (contentType in this.schema) {
            this.schema[contentType].ids.forEach(id => {
                results.push(this.getContent(contentType, id))
            })
        }
        return results
    }

    getAssociatedContents(contentType, id, associatedContentType=null) {
        let associatedContents = []
        let content = this.getContent(contentType, id)
        if (content) {
            forEachKey(content._conns, connectedContentType => {
                if (connectedContentType === associatedContentType || associatedContentType === null) {
                    content._conns[connectedContentType].forEach(connectedContentID => {
                        associatedContents.push(this.getContent(connectedContentType, connectedContentID))
                    })
                }
            })
        }
        return associatedContents
    }

    makeConnection(contentType_a, id_a, contentType_b, id_b) {
        let contentA = this.getContent(contentType_a, id_a)
        let contentB = this.getContent(contentType_b, id_b)

        if (contentA && contentB) {
            if (!(contentB.contentType in contentA._conns)) contentA._conns[contentB.contentType] = new Set()
            if (!(contentA.contentType in contentB._conns)) contentB._conns[contentA.contentType] = new Set()

            contentA._conns[contentB.contentType].add(contentB.id)
            contentB._conns[contentA.contentType].add(contentA.id)
        }
    }

    registerConnections(content) {
        if (content.contentType in this.schema) {
            this.schema[content.contentType].xRefs.forEach(xRef => {
                if (xRef.field in content) {
                    if (xRef.multi) {
                        content[xRef.field].forEach(val => {
                            if (val.id) {
                                this.makeConnection(
                                    content.contentType,
                                    content.id,
                                    xRef.reference,
                                    val.id
                                )
                            }
                        })
                    } else if (content[xRef.field].id) {
                        this.makeConnection(
                            content.contentType,
                            content.id,
                            xRef.reference,
                            content[xRef.field].id
                        )
                    }
                }
            })
        }
    }

    registerIndirectConnections() {
        this.indirectConnections.forEach(triple => {
            let rootCT = triple[0]
            let mediatingCT = triple[1]
            let leafCT = triple[2]

            let rootContents = this.getContents(rootCT)
            rootContents.forEach(rootContent => {
                let mediatingContents = this.getAssociatedContents(rootCT, rootContent.id, mediatingCT)
                mediatingContents.forEach(mediatingContent => {
                    let leafContents = this.getAssociatedContents(mediatingCT, mediatingContent.id, leafCT)
                    leafContents.forEach(leafContent => {
                        this.makeConnection(rootCT, rootContent.id, leafCT, leafContent.id)
                    })
                })
            })
        })
    }

    getTotalConnections(contentTypeA, contentIDA, contentTypeB) {
        let total = 0
        let content = this.getContent(contentTypeA, contentIDA)
        if (content) {
            if (contentTypeB in content._conns) {
                total = content._conns[contentTypeB].size
            }
        }
        return total
    }

    #openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.host, 1)
            request.onupgradeneeded = e => {
                e.target.result.createObjectStore('responses', { keyPath: 'facet' })
            }
            request.onsuccess = e => resolve(e.target.result)
            request.onerror = e => reject(e.target.error)
        }).catch(() => null)
    }

    #dbGet(db, facet) {
        return new Promise((resolve, reject) => {
            const request = db.transaction('responses', 'readonly')
                .objectStore('responses')
                .get(facet)
            request.onsuccess = e => resolve(e.target.result ?? null)
            request.onerror = e => reject(e.target.error)
        })
    }

    #dbPut(db, facet, payload) {
        return new Promise((resolve, reject) => {
            const request = db.transaction('responses', 'readwrite')
                .objectStore('responses')
                .put({ facet, ...payload })
            request.onsuccess = () => resolve()
            request.onerror = e => reject(e.target.error)
        })
    }
}

function getCorpus(host, id, schema={}, indirectConnections=[], callback) {
    let corpus = new Corpus(host, id, schema, indirectConnections)
    corpus.load(callback)
}