/** @typedef {import("../../shared/plugins/useBreakpoints").Breakpoints} Breakpoints */
/*minify:*/
/** @type {function(string, boolean?): boolean} */
let transition = useTransitions(App, { sidebar: true, 'select-columns': false })
/** @type {Breakpoints & {previous: Breakpoints, current: Breakpoints, snap: (function(): void)}} */
let breakpoints = useBreakpoints(App, {
    handlers: {
        change({ previous, current }) { console.log('breakpoints.change', previous, current) } /*debug*/
    }
})
let onRoutesEditChange = null
let lastEditState = null
/** @typedef {{op?:string,tab?:string,provider?:string,preview?:string,body?:string,doc?:string,skip?:string,new?:string,edit?:string}} LocodeRoutes */
/** @typedef {{onEditChange(any): void, update(): void, uiHref(any): string}} LocodeRoutesExtend */
/** @type {LocodeRoutes & LocodeRoutesExtend & {page: string, set: (function(any): void), state: any, to: (function(any): void), href: (function(any): string)}} */
let routes = usePageRoutes(App,{
    page:'op',
    queryKeys:'tab,provider,preview,body,doc,skip,new,edit'.split(','),
    handlers: {
        nav(state) { 
            console.log('nav', state) /*debug*/
            this.update()
        }
    },
    /** @type LocodeRoutesExtend */
    extend: {
        uiHref(args) {
            return this.op && APP.ui.modules.indexOf('/ui') >= 0
                ? appendQueryString(`/ui/${this.op}`, args || {})
                : ''
        },
        onEditChange(fn) {
            onRoutesEditChange = fn
            if (fn == null) lastEditState = null
            console.log('onEditChange', fn != null, lastEditState, this.edit)
            this.update()
        },
        update() {
            console.log('update', this.edit, onRoutesEditChange, lastEditState)
            if (this.edit && onRoutesEditChange) {
                let newState = `${this.op}:${this.edit}`
                if (lastEditState == null || newState !== lastEditState) {
                    console.log('onRoutesEditChange.update', onRoutesEditChange, newState, lastEditState)
                    lastEditState = newState
                    onRoutesEditChange()
                }
            }
        }
    }
})
/** @type {{
    op: (op:string) => any, 
    lookup: (op:string) => any, 
    saveOp: (op:string, fn:Function) => void, 
    hasPrefs: (op:string) => boolean, 
    saveOpProp: (op:string, name:string, fn:Function)=> void, 
    saveLookup: (op:string, fn:Function) => void, 
    events: {
        op: (op:string) => string, 
        lookup: (op:string) => string, 
        opProp: (op:string, name:string) => string
    }, 
    opProp: (op:string, name:string) => any, 
    clearPrefs: (op:string) => void
 }} */
let settings = {
    events: {
        /** @param {string} op */
        op(op) { return `settings:${op}` },
        /** @param {string} op */
        lookup(op) { return `settings:lookup:${op}` },
        /** @param {string} op 
         *  @param {string} name */
        opProp(op,name) { return `settings:${op}.${name}` },
    },
    /** @param {string} op */
    op(op) { 
        return Object.assign({ take:25, selectedColumns:[] },
            map(localStorage.getItem(`locode/op:${op}`), x => JSON.parse(x))) 
    },
    /** @param {string} op */
    lookup(op) {
        return Object.assign({ take:10, selectedColumns:[] },
            map(localStorage.getItem(`locode/lookup:${op}`), x => JSON.parse(x)))
    },
    /** @param {string} op 
     *  @param {Function} fn */
    saveOp(op, fn) {
        let setting = this.op(op)
        fn(setting)
        localStorage.setItem(`locode/op:${op}`, JSON.stringify(setting))
        App.events.publish(this.events.op(op), setting)
    },
    /** @param {string} op
     *  @param {Function} fn */
    saveLookup(op, fn) {
        let setting = this.lookup(op)
        fn(setting)
        localStorage.setItem(`locode/lookup:${op}`, JSON.stringify(setting))
        App.events.publish(this.events.lookup(op), setting)
    },
    /** @param {string} op
     *  @param {string} name */
    opProp(op,name) {
        return Object.assign({ sort:null, filters:[] },
            map(localStorage.getItem(`locode/op:${op}.${name}`), x => JSON.parse(x)))
    },
    /** @param {string} op
     *  @param {string} name 
     *  @param {Function} fn */
    saveOpProp(op, name, fn) {
        let setting = this.opProp(op, name)
        fn(setting)
        localStorage.setItem(`locode/op:${op}.${name}`, JSON.stringify(setting))
        App.events.publish(this.events.opProp(op,name), setting)
    },
    /** @param {string} op */
    hasPrefs(op) {
        let prefixes = [`locode/op:${op}`,`locode/lookup:${op}`]
        return Object.keys(localStorage).some(k => prefixes.some(p => k.startsWith(p)))
    },
    /** @param {string} op */
    clearPrefs(op) {
        let prefixes = [`locode/op:${op}`,`locode/lookup:${op}`]
        let removeKeys = Object.keys(localStorage).filter(k => prefixes.some(p => k.startsWith(p)))
        removeKeys.forEach(k => localStorage.removeItem(k))
    }
}
/** @type {{
    cachedFetch: (url:string) => Promise<string>, 
    copied: boolean, 
    sideNav: {expanded: boolean, operations: MetadataOperationType[], tag: string}[], 
    auth: AuthenticateResponse, 
    readonly displayName: string|null, 
    login: (args:any, $on?:Function) => void, 
    detailSrcResult: any, 
    logout: () => void, 
    readonly isServiceStackType: boolean, 
    readonly opViewModel: string, 
    api: ApiResult<AuthenticateResponse>, 
    modalLookup: any|null, 
    init: () => void, 
    readonly op: MetadataOperationType, 
    debug: boolean, 
    readonly filteredSideNav: {tag: string, operations: MetadataOperationType[], expanded: boolean}[], 
    readonly authProfileUrl: string|null, 
    previewResult: string|null, 
    readonly opDesc: string, 
    toggle: (tag:string) => void, 
    readonly opDataModel: string, 
    readonly authRoles: string[], 
    filter: string, 
    baseUrl: string, 
    readonly authLinks: LinkInfo[], 
    readonly opName: string, 
    SignIn: (opt:any) => Function, 
    hasRole: (role:string) => boolean, 
    readonly authPermissions: string[], 
    readonly useLang: string,  
    invalidAccess: () => string|null
}} */
let store = App.reactive({
    /** @type {string|null} */
    previewResult: null,
    copied: false,
    /** @type {string} */
    filter: '',
    sideNav,
    detailSrcResult: {},
    /** @type {boolean} */
    debug: APP.config.debugMode,
    /** @type {ApiResult<AuthenticateResponse>} */
    api: null,
    /** @type {AuthenticateResponse} */
    auth: window.AUTH,
    /** @type {string} */
    baseUrl: BASE_URL,
    /** @type {any|null} */
    modalLookup: null,
    /** @return {string} */
    get useLang() { return 'csharp' },
    init() {
        setBodyClass({ page: routes.op })
    },
    /** @return {{tag:string,operations:MetadataOperationType[],expanded:boolean}[]} */
    get filteredSideNav() {
        let filter = op => {
            let lowerFilter = this.filter.toLowerCase()
            if (op.requiresAuth && !this.debug)
            {
                if (!this.auth)
                    return false
                if (invalidAccessMessage(op, this.auth))
                    return false
            }
            return !lowerFilter || op.request.name.toLowerCase().indexOf(lowerFilter) >= 0
        }
        let ret = this.sideNav.filter(nav => nav.operations.some(filter))
            .map(nav => ({
                ...nav,
                operations: sortOps(nav.operations.filter(filter))
            }))
        return ret
    },
    /** @param {string} tag */
    toggle(tag) {
        let nav = this.sideNav.find(x => x.tag === tag)
        nav.expanded = !nav.expanded
    },
    /** @return {MetadataOperationType} */
    get op() { return routes.op ? APP.api.operations.find(op => op.request.name === routes.op) : null },
    /** @return {string} */
    get opName() { return this.op && this.op.request.name },
    /** @return {string} */
    get opDesc() { return this.op && (this.op.request.description || humanify(this.op.request.name)) },
    /** @return {string} */
    get opDataModel() { return this.op && this.op.dataModel && this.op.dataModel.name },
    /** @return {string} */
    get opViewModel() { return this.op && this.op.viewModel && this.op.viewModel.name },
    /** @return {boolean} */
    get isServiceStackType() { return this.op && this.op.request.namespace.startsWith("ServiceStack") },
    /** @param {string} url
     *  @returns {Promise<string>} */
    cachedFetch(url) {
        return new Promise((resolve,reject) => {
            let src = CACHE[url]
            if (src) {
                resolve(src)
            } else {
                fetch(url)
                    .then(r => {
                        if (r.ok) return r.text()
                        else throw r.statusText
                    })
                    .then(src => {
                        resolve(CACHE[url] = src)
                    })
                    .catch(e => {
                        console.error(`fetchCache (${url}):`, e)
                        reject(e)
                    })
            }
        })
    },
    /** @param opt
     *  @return {Function}
     *  @constructor */
    SignIn(opt) {
        return APP.plugins.auth
        ? SignIn({
            plugin: APP.plugins.auth,
            provider:() => routes.provider,
            login:args => this.login(args, opt && opt.$on),
            api: () => this.api
        })
        : NoAuth({ message:`Welcome to ${APP.app.serviceName}` })
    },
    /** @param {any} args
     *  @param {Function} [$on] */
    login(args, $on) {
        let provider = routes.provider || 'credentials'
        let authProvider = APP.plugins.auth.authProviders.find(x => x.name === provider)
            || APP.plugins.auth.authProviders[0]
        if (!authProvider)
            throw new Error("!authProvider")
        let auth = new Authenticate()
        bearerToken = authsecret = null
        if (authProvider.type === 'Bearer') {
            bearerToken = client.bearerToken = (args['BearerToken'] || '').trim()
        } else if (authProvider.type === 'authsecret') {
            authsecret = (args['authsecret'] || '').trim()
            client.headers.set('authsecret',authsecret)
        } else {
            auth = new Authenticate({ provider, ...args })
        }
        client.api(auth, { jsconfig: 'eccn' })
            .then(r => {
                this.api = r
                if (r.error && !r.error.message)
                    r.error.message = HttpErrors[r.errorCode] || r.errorCode
                if (this.api.succeeded) {
                    this.auth = this.api.response
                    setBodyClass({ auth: this.auth })
                    if ($on) $on()
                }
            })
    },
    logout() {
        setBodyClass({ auth: this.auth })
        client.api(new Authenticate({ provider: 'logout' }))
        authsecret = bearerToken = client.bearerToken = null
        client.headers.delete('authsecret')
        this.auth = null
        routes.to({ $page:null })
    },
    /** @return {string[]} */
    get authRoles() { return this.auth && this.auth.roles || [] },
    /** @return {string[]} */
    get authPermissions() { return this.auth && this.auth.permissions || [] },
    /** @return {string|null} */
    get authProfileUrl() { return this.auth && this.auth.profileUrl },
    /** @return {LinkInfo[]} */
    get authLinks() {
        let to = []
        let roleLinks = this.auth && APP.plugins.auth && APP.plugins.auth.roleLinks || {} 
        if (Object.keys(roleLinks).length > 0) {
            this.authRoles.forEach(role => {
                if (!roleLinks[role]) return;
                roleLinks[role].forEach(link => to.push(link))
            })
        }
        return to
    },
    /** @return {string|null} */
    get displayName() {
        let auth = this.auth
        return auth
            ? auth.displayName || (auth.firstName ? `${auth.firstName} ${auth.lastName}` : null) || auth.userName || auth.email
            : null
    },
    /** @return {string|null} */
    invalidAccess() { return invalidAccessMessage(this.op, this.auth) },
    /** @param {string} role 
     *  @return {boolean} */
    hasRole(role) { return this.auth && this.auth.roles.indexOf(role) >= 0 },
})
App.events.subscribe('route:nav', args => store.init())
/*:minify*/
