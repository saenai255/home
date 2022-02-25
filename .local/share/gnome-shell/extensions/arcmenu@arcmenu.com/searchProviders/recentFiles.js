const { Meta, Gtk, Gio, GLib, St, Shell } = imports.gi;

const Main = imports.ui.main;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const RecentFilesManager = Me.imports.recentFilesManager;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

function createIcon(mimeType, size) {
    let symbolicIcon = mimeType ? Gio.content_type_get_symbolic_icon(mimeType)?.to_string() : null;
    return symbolicIcon
        ? new St.Icon({ gicon: Gio.icon_new_for_string(symbolicIcon), icon_size: size })
        : new St.Icon({ icon_name: 'icon-missing', icon_size: size });
}

var RecentFilesSearchProvider = class {
    constructor() {
        this.id = 'arcmenu.recent-files';
        this.isRemoteProvider = true;
        this.canLaunchSearch = false;

        this._recentFiles = [];

        this.appInfo = {
            get_description: () => _('Recent Files'),
            get_name: () => _('Recent Files'),
            get_id: () => 'arcmenu.recent-files',
            get_icon: () => Gio.icon_new_for_string('document-open-recent-symbolic'),
        }
    }

    getResultMetas(fileUris, callback) {
        const metas = fileUris.map(fileUri => {
            const rf = this._getRecentFile(fileUri);
            return rf ? {
                id: fileUri,
                name: rf.get_display_name(),
                description: rf.get_uri_display().replace(rf.get_display_name(), ''),
                createIcon: (size) => createIcon(rf.get_mime_type(), size),
            } : undefined;
        }).filter(m => m?.name !== undefined && m?.name !== null);

        callback(metas);
    }

    filterResults(results, maxNumber) {
        return results.slice(0, maxNumber);
    }

    getInitialResultSet(terms, callback, _cancellable) {
        RecentFilesManager.cancelCurrentQueries();
        this._recentFiles = [];
        RecentFilesManager.filterRecentFiles(recentFile => {
            this._recentFiles.push(recentFile);
            callback(this._getFilteredFileUris(terms, this._recentFiles));
        });
    }

    getSubsearchResultSet(previousResults, terms, callback, _cancellable) {
        const recentFiles = previousResults.map(fileUri => this._getRecentFile(fileUri)).filter(rf => rf !== undefined);
        callback(this._getFilteredFileUris(terms, recentFiles));
    }

    activateResult(fileUri, _terms) {
        const recentFile = this._getRecentFile(fileUri);
        if (recentFile){
            let context = global.create_app_launch_context(0, -1);

            new Promise((resolve, reject) => {
                Gio.AppInfo.launch_default_for_uri_async(recentFile.get_uri(), context, null, (o, res) => {
                    try {
                        Gio.AppInfo.launch_default_for_uri_finish(res);
                        resolve();
                    } catch (e) {
                        Main.notifyError(_('Failed to open “%s”').format(recentFile.get_display_name()), e.message);
                        reject(e);
                    }
                });
            });
        }
    }

    launchSearch() {
    }

    _getFilteredFileUris(terms, recentFiles) {
        terms = terms.map(term => term.toLowerCase());
        recentFiles = recentFiles.filter(rf => {
            const fileName = rf.get_display_name()?.toLowerCase();
            const uri = rf.get_uri()?.toLowerCase();
            const fileDescription = rf.get_description()?.toLowerCase();
            return terms.some(term => fileName?.includes(term) || uri?.includes(term) || fileDescription?.includes(term));
        });

        return recentFiles.map(rf => rf.get_uri());
    }

    _getRecentFile(fileUri) {
        return this._recentFiles.find(rf => rf.get_uri() === fileUri);
    }
}
