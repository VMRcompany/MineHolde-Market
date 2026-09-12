import { UserCredential, getAdditionalUserInfo, updateProfile } from 'firebase/auth';

export interface ExtractedYandexData {
  email: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  photoURL: string | null;
}

/**
 * Extracts and normalizes profile data (avatar, last name, first name, email)
 * from Yandex ID OAuth / OIDC response.
 */
export function extractYandexUserData(credential: UserCredential): ExtractedYandexData {
  const user = credential.user;
  const additionalInfo = getAdditionalUserInfo(credential);
  const rawProfile: any = additionalInfo?.profile || {};

  // 1. Extract Email (Почта)
  let email: string | null =
    user.email ||
    rawProfile.default_email ||
    rawProfile.email ||
    (Array.isArray(rawProfile.emails) && rawProfile.emails.length > 0 ? rawProfile.emails[0] : null) ||
    (rawProfile.login ? `${rawProfile.login}@yandex.ru` : null) ||
    (user.providerData && user.providerData[0]?.email ? user.providerData[0].email : null);

  // 2. Extract First Name (Имя) & Last Name (Фамилия)
  let firstName = (rawProfile.first_name || rawProfile.given_name || '').trim();
  let lastName = (rawProfile.last_name || rawProfile.family_name || '').trim();

  // If first_name or last_name is missing, parse full name / real_name / display_name
  if (!firstName || !lastName) {
    const rawFullName = (
      rawProfile.real_name ||
      rawProfile.display_name ||
      rawProfile.name ||
      user.displayName ||
      ''
    ).trim();

    if (rawFullName) {
      const parts = rawFullName.split(/\s+/);
      if (parts.length >= 2) {
        if (!firstName && !lastName) {
          firstName = parts[0];
          lastName = parts.slice(1).join(' ');
        } else if (!firstName) {
          firstName = parts[0];
        } else if (!lastName) {
          lastName = parts.slice(1).join(' ');
        }
      } else if (parts.length === 1) {
        if (!firstName) firstName = parts[0];
      }
    }
  }

  // Fallback from email prefix if still missing
  if (!firstName && email) {
    const localPart = email.split('@')[0];
    const subParts = localPart.split(/[._-]/);
    firstName = subParts[0] ? subParts[0].charAt(0).toUpperCase() + subParts[0].slice(1) : 'Пользователь';
    if (!lastName && subParts.length > 1) {
      lastName = subParts[1].charAt(0).toUpperCase() + subParts[1].slice(1);
    }
  }

  if (!firstName) {
    firstName = 'Пользователь';
  }

  // 3. Display Name
  const displayName =
    (firstName && lastName ? `${firstName} ${lastName}` : firstName) ||
    rawProfile.display_name ||
    rawProfile.real_name ||
    user.displayName ||
    (email ? email.split('@')[0] : 'Пользователь Яндекс');

  // 4. Extract Avatar (Аватарка)
  let photoURL: string | null = user.photoURL || null;

  if (!photoURL || photoURL.trim() === '') {
    if (rawProfile.picture) {
      photoURL = rawProfile.picture;
    } else if (rawProfile.avatar_url) {
      photoURL = rawProfile.avatar_url;
    } else if (rawProfile.default_avatar_id) {
      // Yandex avatar CDN template for islands-200 high-res image
      photoURL = `https://avatars.yandex.net/get-yapic/${rawProfile.default_avatar_id}/islands-200`;
    } else if (rawProfile.avatar_id) {
      photoURL = `https://avatars.yandex.net/get-yapic/${rawProfile.avatar_id}/islands-200`;
    } else if (user.providerData && user.providerData[0]?.photoURL) {
      photoURL = user.providerData[0].photoURL;
    }
  }

  return {
    email,
    firstName,
    lastName,
    displayName,
    photoURL,
  };
}

/**
 * Syncs extracted Yandex profile data to Firebase Auth user object
 */
export async function syncYandexProfileToFirebaseUser(credential: UserCredential, data: ExtractedYandexData): Promise<void> {
  try {
    const updates: { displayName?: string; photoURL?: string } = {};
    if (data.displayName && (!credential.user.displayName || credential.user.displayName === 'Пользователь')) {
      updates.displayName = data.displayName;
    }
    if (data.photoURL && !credential.user.photoURL) {
      updates.photoURL = data.photoURL;
    }
    if (Object.keys(updates).length > 0) {
      await updateProfile(credential.user, updates);
    }
  } catch (err) {
    console.warn('Could not update Firebase user profile:', err);
  }
}
