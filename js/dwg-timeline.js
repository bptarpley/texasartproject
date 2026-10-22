// the Dallas Women's Gallery interactive timeline: the gallery's events (exhibits and administrative changes) in
// chronological order, each showing its dates, title, postcard, and participating artists with their artifacts.
// events are rendered as skeletons up front and filled in as they scroll into view

const dwgTimelineSchema = {
    ArtWork: {
        preload: true,
        criteria: {
            'f_project.id': TAP.projects.dwg,
            'e_iiif_uri': 'y',
            only: 'id,artists.id,iiif_uri',
        }
    },
    Event: {
        preload: true,
        sortFields: ['+timespan.start'],
        criteria: {
            'f_project.id': TAP.projects.dwg,
            'e_timespan.start': 'y',
            only: 'id,title,event_type.name,year,timespan,opening,agents.id,artifacts.id,location.name',
        }
    },
}

function getDwgTimelineCorpus(callback) {
    getTapCorpus(dwgTimelineSchema, [], callback)
}

class EphemeraTimeline {
    constructor(element, corpus) {
        this.element = element
        this.corpus = corpus
        this.eventObserver = null
        this.visibleEvents = new Set()
        this.navigating = false

        this.filteredAgentIDs = []
        this.events = {}
        this.agents = {}
        this.artifacts = {}
        this.artworks = {}
        this.galleries = {}     // per artist per event: {artifactIDs, artworkIDs, loaded}
        this.years = []

        this.agentColors = [
            '#EACFA2',
            '#E1B671',
            '#CDA15E',
            '#D89962',
            '#BF7C51',
            '#BABFA2',
            '#BCAA7A',
            '#ABA771',
            '#BAB8B2',
        ]
        this.agentColorCursor = 0

        clearEl(this.element)
        appendToEl(this.element, `
            <div id="ephemera-timeline-top-bar">
                <div id="ephemera-timeline-top-bar-info-container">
                    <span id="ephemera-timeline-filter-indicator"></span>
                    <div id="ephemera-timeline-top-bar-year-menu" class="dropdown position-absolute">
                        <h3 id="ephemera-timeline-top-bar-year" class="dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">1975</h3>
                        <div id="ephemera-timeline-year-selector" class="dropdown-menu">
                        </div>
                    </div>
                    <h3 id="ephemera-timeline-top-bar-title"></h3>
                </div>
            </div>
        `)
        this.yearIndicator = getEl('ephemera-timeline-top-bar-year')
        this.yearSelector = getEl('ephemera-timeline-year-selector')

        // agent names, year selections, and gallery expanders are created as events get built
        this.element.addEventListener('click', (e) => {
            let agentName = e.target.closest('.event-agent-name')
            let yearSelection = e.target.closest('.year-selection')
            let trayExpander = e.target.closest('.artifact-tray-expander')

            if (agentName) window.location.href = `?personID=${agentName.dataset.personId}`
            else if (yearSelection) this.navigateToYear(yearSelection.dataset.year)
            else if (trayExpander) this.toggleGallery(trayExpander.dataset.galleryId)
        })

        // check if filtering by person
        let personID = new URLSearchParams(window.location.search).get('personID')
        if (personID) this.filterByPerson(personID)
        else this.renderEventSkeletons()
    }

    renderEventSkeletons() {
        this.setupEventObserver()

        this.corpus.getContents('ArtWork').forEach(artwork => this.artworks[artwork.id] = artwork)

        this.corpus.getContents('Event').forEach(event => {
            this.events[event.id] = event

            if (event.event_type && event.event_type.name) event.event_type = event.event_type.name
            let adminEvent = event.event_type !== 'Exhibit'
            event.adminEvent = adminEvent

            let agentDivs = []
            if (event.agents) {
                event.agents.forEach(agentStub => {
                    if (this.filteredAgentIDs.length === 0 || this.filteredAgentIDs.includes(agentStub.id)) {
                        let agentColor = this.getAgentColor()
                        let agentDivID = `ephemera-timeline-event-${event.id}-agent-${agentStub.id}`
                        this.galleries[`${agentDivID}-gallery`] = {artifactIDs: [], artworkIDs: [], loaded: false}

                        agentDivs.push(`
                            <div id="${agentDivID}"
                                class="ephemera-timeline-event-agent d-none"
                                data-agent-color="${agentColor}"
                                style="background-color: ${agentColor};">
                            </div>
                            <div id="${agentDivID}-gallery"
                                class="ephemera-timeline-event-agent-gallery collapse"
                                style="background-color: ${agentColor};">

                                <div class="gallery-placeholder"></div>
                            </div>
                        `)
                    }
                })
            }

            if (adminEvent || agentDivs.length) {
                appendToEl(this.element, `
                    <div id="ephemera-timeline-header-${event.id}" class="ephemera-timeline-header d-none" style="background: ${this.generateBackgroundStripes(adminEvent)}">
                        <h3 id="ephemera-timeline-header-director-${event.id}" style="width: 50%" class="ephemera-timeline-header-director"></h3>
                        <h3 id="ephemera-timeline-header-address-${event.id}" style="width: 25%" class="ephemera-timeline-header-address"></h3>
                    </div>
                    <div id="ephemera-timeline-era-${event.id}" class="ephemera-timeline-era" style="background: ${this.generateBackgroundStripes(adminEvent)}">
                        <div id="ephemera-timeline-event-${event.id}" class="ephemera-timeline-event skeleton" data-id="${event.id}" data-year="${event.year}">
                            <div id="ephemera-timeline-event-body-${event.id}" class="ephemera-timeline-event-body">
                                <div id="ephemera-timeline-event-postcard-container-${event.id}" class="ephemera-timeline-event-postcard-container${adminEvent ? ' admin-event' : ''}"></div>
                                <div class="ephemera-timeline-event-header-artists-container">
                                    <div id="ephemera-timeline-event-header-${event.id}" class="ephemera-timeline-event-header${adminEvent ? ' admin-event' : ''}"></div>
                                    <div id="ephemera-timeline-event-artists-container-${event.id}" class="ephemera-timeline-event-artists-container${agentDivs.length ? '' : ' no-agents'}">
                                        ${agentDivs.join(' ')}
                                    </div>
                                    <div class="ephemera-timeline-event-header-artists-footer${adminEvent ? ' admin-event' : ''}${agentDivs.length ? '' : ' no-agents'}"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                `)
                this.eventObserver.observe(getEl(`ephemera-timeline-event-${event.id}`))

                // add event year to year selector
                if (event.year && !this.years.includes(event.year)) {
                    this.years.push(event.year)
                    appendToEl(this.yearSelector, `
                        <button class="dropdown-item year-selection" data-year="${event.year}">${event.year}</button>
                    `)
                }
            }

            // gallery changes show up in the sticky header, so build them right away
            if (['Administrative Changes', 'Gallery Expansion/Move'].includes(event.event_type)) this.constructEvent(event.id, true)
        })
    }

    setupEventObserver() {
        this.eventObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                let eventID = entry.target.dataset.id

                if (entry.isIntersecting) {
                    this.visibleEvents.add(eventID)
                    this.constructEvent(eventID)
                } else {
                    this.visibleEvents.delete(eventID)
                }
            })

            this.setYearIndicator()
        }, {rootMargin: '-80px 0px 0px 0px'})  // ignore what's hidden under the sticky top bar and gallery header
    }

    navigateToYear(year) {
        let firstEventForYear = this.element.querySelector(`.ephemera-timeline-event[data-year="${year}"]`)

        // don't build every event scrolled past on the way there
        this.navigating = true
        firstEventForYear.scrollIntoView({behavior: 'smooth'})
        setTimeout(() => {
            this.pinEvent(firstEventForYear)
            this.navigating = false
            this.visibleEvents.forEach(eventID => this.constructEvent(eventID))
            this.setYearIndicator()
        }, 2000)
    }

    // events above a jumped-to event keep growing for a moment as their data and images load, pushing it down the
    // page (and exposing more events to build, which grow in turn). keep it lined up beneath the sticky bars until
    // things settle, or until the user scrolls on their own
    pinEvent(eventDiv, duration=5000) {
        let realign = () => eventDiv.scrollIntoView()
        let resizeObserver = new ResizeObserver(realign)
        let userEvents = ['wheel', 'touchstart', 'keydown', 'mousedown']
        let release = () => {
            resizeObserver.disconnect()
            userEvents.forEach(type => window.removeEventListener(type, release))
        }

        realign()
        resizeObserver.observe(this.element)
        userEvents.forEach(type => window.addEventListener(type, release, {passive: true}))
        setTimeout(release, duration)
    }

    async constructEvent(eventID, adminEvent=false) {
        let event = this.events[eventID]
        let eventDiv = getEl(`ephemera-timeline-event-${eventID}`)
        let eventHeader = getEl(`ephemera-timeline-event-header-${eventID}`)
        let agentRequestIDs = []

        if (!eventDiv || eventDiv.dataset.built || this.navigating) return
        eventDiv.dataset.built = 'true'

        let dateString = 'Date Unknown'
        let opening = ''
        let guestCurators = []
        let newGalleryDirector = ''
        let newGalleryAddress = ''

        // try to construct event date
        if (event.timespan) {
            let dateOptions = {month: 'short', day: 'numeric', year: 'numeric'}
            let startDate = new Date(event.timespan.start).toLocaleDateString('en-US', dateOptions)
            let endDate = new Date(event.timespan.end).toLocaleDateString('en-US', dateOptions)

            if (startDate === endDate || !event.timespan.end) dateString = startDate
            else dateString = `${startDate} &ndash; ${endDate}`
        }

        // try to determine opening timespan
        if (event.opening) {
            let timeOptions = {hour: 'numeric', hour12: true}
            let startTime = new Date(event.opening.start).toLocaleTimeString('en-US', timeOptions)
            let endTime = new Date(event.opening.end).toLocaleTimeString('en-US', timeOptions)

            if (startTime === endTime) opening = startTime
            else opening = `${startTime} &ndash; ${endTime}`
        }

        // try to determine gallery address
        if (adminEvent && event.location) newGalleryAddress = event.location.name

        if (event.agents) {
            event.agents.forEach(agent => {
                if (!(agent.id in this.agents)) agentRequestIDs.push(agent.id)
            })

            if (agentRequestIDs.length) {
                let agentParams = buildGetParams({'f_id|': agentRequestIDs.join('__'), 'page-size': agentRequestIDs.length})
                let agentInfo = await fetch(`${this.corpus.api}/Agent/?${agentParams}`).then(res => res.json())

                agentInfo.records.forEach(agent => {
                    this.agents[agent.id] = agent
                    if (agent.role && agent.role.name) agent.role = agent.role.name
                })
            }

            event.agents.forEach(agentStub => {
                let agent = this.agents[agentStub.id]
                if (!agent) return

                // determine director
                if (adminEvent && agent.role === 'DWG Director') newGalleryDirector = agent.person.name

                // determine if guest curator
                if (agent.role === 'Guest Curator') guestCurators.push(agent.person.name)

                // exhibits only list their artists
                let agentDiv = getEl(`ephemera-timeline-event-${eventID}-agent-${agent.id}`)
                if (agentDiv && (event.event_type !== 'Exhibit' || agent.role === 'Artist')) {
                    agentDiv.innerHTML = `
                        <div class="event-agent-name" data-agent-id="${agent.id}" data-person-id="${agent.person.id}">
                            ${agent.person.name}
                        </div>
                        <div id="event-${event.id}-agent-${agent.id}-artifact-marker-holder" class="artifact-marker-holder">
                            <svg id="event-${event.id}-agent-${agent.id}-artifact-tray-expander" class="artifact-tray-expander d-none"
                                data-gallery-id="${agentDiv.id}-gallery" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5.91 4.57">
                                <g style="isolation: isolate;">
                                    <g style="mix-blend-mode: multiply;">
                                        <path style="fill: ${agentDiv.dataset.agentColor}; stroke-width: 0px;"
                                            d="M3.73,4.57h-1.54L0,0h1.41l1.51,3.32h.09l1.5-3.32h1.41l-2.18,4.57Z"/>
                                    </g>
                                </g>
                            </svg>
                        </div>
                    `
                    agentDiv.classList.remove('d-none')
                }
            })
        }

        appendToEl(eventHeader, `
            <div class="event-header-date-column">
                <h3>${dateString}</h3>
                ${opening ? `<span>Opening reception: ${opening}</span>` : ''}
            </div>
            <div class="event-header-title-column">
                <h3>${event.title}</h3>
                ${guestCurators.length ? `<span>Guest curator(s): ${guestCurators.join(', ')}</span>` : ''}
            </div>
        `)

        if (newGalleryDirector || newGalleryAddress) {
            getEl(`ephemera-timeline-header-director-${eventID}`).innerHTML = newGalleryDirector
            getEl(`ephemera-timeline-header-address-${eventID}`).innerHTML = newGalleryAddress
            getEl(`ephemera-timeline-header-${eventID}`).classList.remove('d-none')
            eventDiv.classList.add('beneath-header')
        }

        // listings of the event's artifacts tell us how many each agent has and which one is the postcard. show
        // the postcard now, and save getting images for the rest until a user expands an agent's gallery
        if (event.artifacts && event.artifacts.length) {
            let artifactIDs = event.artifacts.map(artifactStub => artifactStub.id)
            let artifactParams = buildGetParams({
                'f_id|': artifactIDs.join('__'),
                only: 'agents.id,media_type.name,associated_artworks.id',
                'page-size': artifactIDs.length,
            })
            fetch(`${this.corpus.api}/Document/?${artifactParams}`)
                .then(res => res.json())
                .then(artifactInfo => {
                    if (artifactInfo.records) {
                        artifactInfo.records.forEach(artifact => {
                            if (artifact.media_type && artifact.media_type.name === 'Postcard') event.postcardID = artifact.id
                            else if (artifact.agents) {
                                artifact.agents.forEach(agent => this.addAgentArtifactMarker(eventID, agent.id, artifact.id))
                            }

                            if (artifact.associated_artworks) {
                                artifact.associated_artworks.forEach(artworkStub => {
                                    let artwork = this.artworks[artworkStub.id]
                                    if (artwork && artwork.artists) {
                                        artwork.artists.forEach(artist => this.addAgentArtifactMarker(eventID, artist.id, artwork.id, true))
                                    }
                                })
                            }
                        })
                    }

                    if (event.postcardID) this.showEventPostcard(eventID)
                })
        }
    }

    addAgentArtifactMarker(eventID, agentID, artifactID, isArtwork=false) {
        let agentDiv = getEl(`ephemera-timeline-event-${eventID}-agent-${agentID}`)
        let markerHolder = getEl(`event-${eventID}-agent-${agentID}-artifact-marker-holder`)
        let trayExpander = getEl(`event-${eventID}-agent-${agentID}-artifact-tray-expander`)
        if (!agentDiv || !markerHolder) return

        let galleryID = `${agentDiv.id}-gallery`
        if (isArtwork) this.galleries[galleryID].artworkIDs.push(artifactID)
        else this.galleries[galleryID].artifactIDs.push(artifactID)

        appendToEl(markerHolder, `
            <span class="artifact-marker" style="background-color: ${agentDiv.dataset.agentColor};"></span>
        `)

        if (trayExpander.classList.contains('d-none')) {
            trayExpander.classList.remove('d-none')
            getEl(galleryID).addEventListener('shown.bs.collapse', () => this.loadGallery(eventID, galleryID))
        }
    }

    toggleGallery(galleryID) {
        bootstrap.Collapse.getOrCreateInstance(getEl(galleryID), {toggle: false}).toggle()
    }

    loadGallery(eventID, galleryID) {
        let gallery = this.galleries[galleryID]
        if (gallery.loaded) return
        gallery.loaded = true

        let galleryEl = getEl(galleryID)
        let numCols = 3
        let gapSize = 3
        let maxWidth = parseInt((galleryEl.clientWidth - (gapSize * (numCols - 1))) / numCols)
        let addThumbnail = (url, artifactID, imgInfo) => {
            appendToEl(galleryEl, `
                <a href="${url}" target="_blank">
                    <img src="${imgInfo.src}" class="ephemera-thumbnail" data-event="${eventID}" data-artifact="${artifactID}" />
                </a>
            `)
            let placeholder = galleryEl.querySelector('.gallery-placeholder')
            if (placeholder) placeholder.remove()
        }

        gallery.artifactIDs.forEach(artifactID => {
            this.getArtifact(artifactID, (artifact) => {
                let imgInfo = this.getArtifactImage(artifact, maxWidth, null, true)
                if (imgInfo !== null) addThumbnail(`${window.rootPath}ephemera-detail/?id=${artifactID}`, artifactID, imgInfo)
            })
        })

        gallery.artworkIDs.forEach(artworkID => {
            this.getArtwork(artworkID, (artwork) => {
                let imgInfo = this.getArtifactImage(artwork, maxWidth, null, true)
                if (imgInfo !== null) addThumbnail(`${window.rootPath}artwork/?id=${artworkID}&filters=off`, artworkID, imgInfo)
            })
        })
    }

    showEventPostcard(eventID) {
        let event = this.events[eventID]
        if (!event || !event.postcardID) return

        this.getArtifact(event.postcardID, (postcard) => {
            let imgInfo = this.getArtifactImage(postcard, 130)
            if (imgInfo === null) return

            let postcardHolder = getEl(`ephemera-timeline-event-postcard-container-${eventID}`)
            appendToEl(postcardHolder, `
                <a href="${window.rootPath}ephemera-detail/?id=${event.postcardID}" target="_blank">
                    <img id="ephemera-timeline-event-postcard-${eventID}"
                        src="${imgInfo.src}" class="postcard-image ephemera-thumbnail"
                        data-event="${eventID}" data-artifact="${event.postcardID}" />
                </a>
            `)

            // keep the postcard from floating above a long list of artists
            let artistHolder = getEl(`ephemera-timeline-event-artists-container-${eventID}`)
            if (artistHolder.clientHeight > imgInfo.height) {
                postcardHolder.style.alignItems = 'start'
                getEl(`ephemera-timeline-event-postcard-${eventID}`).style.marginTop = '55px'
            }
        })
    }

    getArtifact(artifactID, callback) {
        if (artifactID in this.artifacts) {
            callback(this.artifacts[artifactID])
            return
        }

        // (Corpora errors on only=pages by itself, hence the uri)
        fetch(`${this.corpus.api}/Document/${artifactID}/?only=pages,uri`)
            .then(res => res.json())
            .then(artifact => {
                this.artifacts[artifactID] = artifact
                callback(artifact)
            })
    }

    getArtwork(artworkID, callback) {
        let artwork = this.artworks[artworkID]
        if (artwork.iiifInfo) {
            callback(artwork)
            return
        }

        fetch(`${artwork.iiif_uri}/info.json`)
            .then(res => res.json())
            .then(iiifInfo => {
                artwork.iiifInfo = iiifInfo
                callback(artwork)
            })
    }

    // the IIIF URL and display size for an artifact's (first page) image, scaled to fit maxWidth or maxHeight.
    // previewSquare crops it to a square from the top left corner
    getArtifactImage(artifact, maxWidth=null, maxHeight=null, previewSquare=false) {
        let iiifURI = null
        let fileWidth = null
        let fileHeight = null
        let reqSize = 'full'
        let reqRegion = 'full'

        let firstPage = artifact.pages && artifact.pages['1']
        if (firstPage && firstPage.files) {
            let fileKeys = Object.keys(firstPage.files)
            if (fileKeys.length > 0) {
                let file = firstPage.files[fileKeys[0]]
                iiifURI = `${TAP.corporaHost}/iiif/2${file.path}`
                fileWidth = file.width
                fileHeight = file.height
            }
        } else if (artifact.iiif_uri && artifact.iiifInfo) {
            iiifURI = artifact.iiif_uri
            fileWidth = artifact.iiifInfo.width
            fileHeight = artifact.iiifInfo.height
        }

        if (iiifURI === null) return null

        if (maxWidth !== null && maxWidth <= fileWidth) {
            reqSize = `${maxWidth},`
            maxHeight = parseInt(fileHeight * (maxWidth / fileWidth))
        } else if (maxHeight !== null && maxHeight <= fileHeight) {
            reqSize = `,${maxHeight}`
            maxWidth = parseInt(fileWidth * (maxHeight / fileHeight))
        } else {
            maxWidth = fileWidth
            maxHeight = fileHeight
        }

        if (previewSquare) {
            if (fileWidth > fileHeight) reqRegion = `0,0,${fileHeight},${fileHeight}`
            else reqRegion = `0,0,${fileWidth},${fileWidth}`
        }

        return {
            src: `${iiifURI}/${reqRegion}/${reqSize}/0/default.png`,
            width: maxWidth,
            height: maxHeight
        }
    }

    filterByPerson(personID) {
        let agentParams = buildGetParams({'f_person.id': personID, 'page-size': 100})
        fetch(`${this.corpus.api}/Agent/?${agentParams}`)
            .then(res => res.json())
            .then(agentInfo => {
                if (agentInfo.records) {
                    let agentName = ''

                    agentInfo.records.forEach(agent => {
                        this.agents[agent.id] = agent
                        if (agent.role && agent.role.name) agent.role = agent.role.name
                        this.filteredAgentIDs.push(agent.id)
                        if (!agentName) agentName = agent.person.name
                    })

                    getEl('ephemera-timeline-filter-indicator').innerHTML = `
                        <span class="ephemera-timeline-filter">
                            ${agentName}
                            <a href="?" class="ephemera-timeline-filter-clear" title="Clear filter"><span class="dashicons dashicons-dismiss"></span></a>
                        </span>
                    `
                }

                this.renderEventSkeletons()
            })
    }

    // show the year of the topmost visible event
    setYearIndicator() {
        let lowestYValue = null

        this.visibleEvents.forEach(eventID => {
            let event = this.events[eventID]
            if (!event || !event.year) return

            let yValue = getEl(`ephemera-timeline-event-${eventID}`).getBoundingClientRect().top
            if (lowestYValue === null || yValue < lowestYValue) {
                this.yearIndicator.innerHTML = event.year
                lowestYValue = yValue
            }
        })
    }

    // the timeline's vertical rules: a center line marking time, and a line separating the gallery's address
    generateBackgroundStripes(adminEvent=false) {
        let color = adminEvent ? '#BAB8B2' : '#C9C9C2'

        return `linear-gradient(
            to right,
            #FFFFFF calc(50% - 11px),
            ${color} calc(50% - 11px) calc(50% - 1px),
            #000000 calc(50% - 1px) 50%,
            ${color} 50% calc(50% + 10px),
            #FFFFFF calc(50% + 10px) calc(75% - 1px),
            #59554D calc(75% - 1px) 75%,
            #FFFFFF 75%
        )`
    }

    getAgentColor() {
        let agentColor = this.agentColors[this.agentColorCursor]
        this.agentColorCursor = (this.agentColorCursor + 1) % this.agentColors.length
        return agentColor
    }
}
