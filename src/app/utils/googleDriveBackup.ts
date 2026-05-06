// Google Drive backup service
const BACKUP_FOLDER_ID = '1ss1CKK_eN-rTV54Y5fYl5oh9MPlU46sM';
const BACKUP_FILE_NAME = 'couple-app-backup.json';

// Load Google Identity Services script
let gsiLoaded = false;
let gsiLoadPromise: Promise<void> | null = null;

const loadGSI = (): Promise<void> => {
  if (gsiLoaded) return Promise.resolve();
  if (gsiLoadPromise) return gsiLoadPromise;

  gsiLoadPromise = new Promise((resolve, reject) => {
    if (typeof window.google !== 'undefined' && window.google.accounts) {
      gsiLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Wait a bit for the library to fully initialize
      setTimeout(() => {
        if (window.google?.accounts?.oauth2) {
          gsiLoaded = true;
          resolve();
        } else {
          reject(new Error('Google Identity Services loaded but not initialized'));
        }
      }, 100);
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });

  return gsiLoadPromise;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token: string; expires_in: number }) => void;
            error_callback?: (error: any) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

class GoogleDriveBackup {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private tokenClient: any = null;

  async authenticate(): Promise<void> {
    const clientId = localStorage.getItem('google_client_id');

    if (!clientId) {
      throw new Error('Google Client ID not configured');
    }

    // Check if we have a valid token
    const storedToken = localStorage.getItem('google_access_token');
    const storedExpiry = localStorage.getItem('google_token_expiry');

    if (storedToken && storedExpiry) {
      const expiryTime = parseInt(storedExpiry, 10);
      if (Date.now() < expiryTime - 60000) { // 1 minute buffer
        this.accessToken = storedToken;
        this.tokenExpiry = expiryTime;
        console.log('[GoogleDriveBackup] Using cached token');
        return;
      }
    }

    // Load Google Identity Services and authenticate
    await this.authenticateWithGSI(clientId);
  }

  private async authenticateWithGSI(clientId: string): Promise<void> {
    console.log('[GoogleDriveBackup] Starting GSI authentication');

    try {
      // Load Google Identity Services
      await loadGSI();

      if (!window.google?.accounts?.oauth2) {
        throw new Error('Google Identity Services not available');
      }

      return new Promise((resolve, reject) => {
        try {
          // Create token client
          this.tokenClient = window.google!.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (response: { access_token: string; expires_in: number }) => {
              console.log('[GoogleDriveBackup] Token received from GSI');

              this.accessToken = response.access_token;
              this.tokenExpiry = Date.now() + (response.expires_in * 1000);

              localStorage.setItem('google_access_token', response.access_token);
              localStorage.setItem('google_token_expiry', this.tokenExpiry.toString());

              resolve();
            },
            error_callback: (error: any) => {
              console.error('[GoogleDriveBackup] GSI error:', error);
              if (error.type === 'popup_closed') {
                reject(new Error('Authentication cancelled'));
              } else if (error.type === 'popup_failed_to_open') {
                reject(new Error('Failed to open authentication window. Please disable your popup blocker.'));
              } else {
                reject(new Error(`Authentication failed: ${error.message || error.type || 'Unknown error'}`));
              }
            },
          });

          // Request access token - this opens the auth popup
          console.log('[GoogleDriveBackup] Requesting access token');
          this.tokenClient.requestAccessToken();
        } catch (error) {
          console.error('[GoogleDriveBackup] Error initializing token client:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('[GoogleDriveBackup] Failed to load GSI:', error);
      throw new Error('Failed to load Google authentication. Please check your internet connection.');
    }
  }

  async findBackupFile(): Promise<string | null> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?` +
        `q=name='${BACKUP_FILE_NAME}' and '${BACKUP_FOLDER_ID}' in parents and trashed=false` +
        `&fields=files(id,name,modifiedTime)`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to search files: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }

      return null;
    } catch (error) {
      console.error('Error finding backup file:', error);
      throw error;
    }
  }

  async uploadBackup(backupData: any): Promise<void> {
    const clientId = localStorage.getItem('google_client_id');

    if (!clientId) {
      throw new Error('Google Client ID not configured');
    }

    if (!this.accessToken) {
      await this.authenticate();
    }

    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      const existingFileId = await this.findBackupFile();

      const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: 'application/json',
        parents: existingFileId ? undefined : [BACKUP_FOLDER_ID],
      };

      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const closeDelim = "\r\n--" + boundary + "--";

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(backupData) +
        closeDelim;

      const url = existingFileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
        : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

      const method = existingFileId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload backup: ${response.statusText}`);
      }

      console.log('Backup uploaded successfully to Google Drive');
    } catch (error) {
      console.error('Error uploading backup:', error);
      throw error;
    }
  }

  async downloadBackup(): Promise<any | null> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      const fileId = await this.findBackupFile();

      if (!fileId) {
        console.log('No backup file found in Google Drive');
        return null;
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to download backup: ${response.statusText}`);
      }

      const backupData = await response.json();
      console.log('Backup downloaded successfully from Google Drive');
      return backupData;
    } catch (error) {
      console.error('Error downloading backup:', error);
      throw error;
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && Date.now() < this.tokenExpiry - 60000;
  }

  logout(): void {
    this.accessToken = null;
    this.tokenExpiry = 0;
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
  }
}

export const googleDriveBackup = new GoogleDriveBackup();
