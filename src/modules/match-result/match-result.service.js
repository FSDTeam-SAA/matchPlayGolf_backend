// // src/modules/match-result/match-result.service.js
// import Match from '../match/match.model.js';
// import { uploadToCloudinary } from '../../lib/uploadToCloudinary.js';

// /**
//  * Update tournament match result fields (comments + photo) on Match
//  * @param {ObjectId} userId - current user
//  * @param {ObjectId} matchId - tournament Match _id
//  * @param {Object} data - { comments?: string }
//  * @param {Express.Multer.File|null} file - optional photo file
//  */
// export const updateTournamentMatchResultService = async (
//   userId,
//   matchId,
//   data,
//   file
// ) => {
//   const match = await Match.findById(matchId);
//   if (!match) {
//     return null;
//   }

//   // Optional: authorization check (uncomment if needed)
//   // if (match.createdBy.toString() !== userId.toString()) {
//   //   const err = new Error("Not authorized to update this match");
//   //   err.code = "FORBIDDEN";
//   //   throw err;
//   // }

//   if (data.comments !== undefined) {
//     match.comments = data.comments;
//   }

//   if (file && file.buffer) {
//     const uploadResult = await uploadToCloudinary(
//       file.buffer,
//       file.originalname || 'match_photo',
//       'match_photos'
//     );
//     if (uploadResult?.secure_url) {
//       match.photo = uploadResult.secure_url;
//     }
//   }

//   await match.save();
//   return match;
// };