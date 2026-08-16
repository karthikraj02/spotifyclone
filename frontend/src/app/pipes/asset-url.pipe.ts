import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Resolves an asset path returned by the API (song cover, artist image, playlist
 * cover, user avatar, etc.) to a URL the browser can actually load.
 *
 * The backend returns two kinds of paths:
 *  - absolute URLs for seed/external images, e.g. https://picsum.photos/...
 *  - relative paths for anything uploaded through the admin panel, e.g. /uploads/images/xyz.jpg
 *
 * Binding a relative path directly to [src] resolves it against the *frontend's*
 * origin, not the backend's, so uploaded covers/images render broken as soon as
 * frontend and backend are on different origins (which is the normal production
 * setup). This pipe prefixes relative paths with environment.serverUrl, the same
 * way PlayerService already does for audio URLs, and leaves absolute/data URLs alone.
 */
@Pipe({
  name: 'assetUrl',
  standalone: true
})
export class AssetUrlPipe implements PipeTransform {
  transform(path: string | null | undefined): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path;
    }
    return `${environment.serverUrl}${path}`;
  }
}
