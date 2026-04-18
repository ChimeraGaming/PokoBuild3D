import missingImageUrl from '../../Images/Site/Missing_Image.jpg'

export function getBuildThumbnail(build) {
  if (build?.thumbnailUrl) {
    return build.thumbnailUrl
  }

  if (Array.isArray(build?.imageGallery) && build.imageGallery[0]?.imageUrl) {
    return build.imageGallery[0].imageUrl
  }

  return missingImageUrl
}
