"use server";

import { revalidatePath } from "next/cache";

import { connectToDB } from "../mongoose";

import User from "../models/user.model";
import NerdTalk from "../models/nerdtalk.model";
import Community from "../models/community.model";

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
  connectToDB();

  // Calculate the number of posts to skip based on the page number and page size.
  const skipAmount = (pageNumber - 1) * pageSize;

  // Create a query to fetch the posts that have no parent (top-level NerdTalks) (a NerdTalk that is not a comment/reply).
  const postsQuery = NerdTalk.find({ parentId: { $in: [null, undefined] } })
    .sort({ createdAt: "desc" })
    .skip(skipAmount)
    .limit(pageSize)
    .populate({
      path: "author",
      model: User,
    })
    .populate({
      path: "community",
      model: Community,
    })
    .populate({
      path: "children", // Populate the children field
      populate: {
        path: "author", // Populate the author field within children
        model: User,
        select: "_id name parentId image", // Select only _id and username fields of the author
      },
    });

  // Count the total number of top-level NerdTalks (NerdTalks that are not comments).
  const totalPostsCount = await NerdTalk.countDocuments({
    parentId: { $in: [null, undefined] },
  }); // Get the total count of posts

  const posts = await postsQuery.exec();

  const isNext = totalPostsCount > skipAmount + posts.length;

  return { posts, isNext };
}

interface Params {
  text: string,
  author: string,
  communityId: string | null,
  path: string,
}

export async function createNerdTalk({ text, author, communityId, path }: Params
) {
  try {
    connectToDB();

    const communityIdObject = await Community.findOne(
      { id: communityId },
      { _id: 1 }
    );

    const createdNerdTalk = await NerdTalk.create({
      text,
      author,
      community: communityIdObject, // Assign communityId if provided, or leave it null for personal account
    });

    // Update User model
    await User.findByIdAndUpdate(author, {
      $push: { nerdtalks: createdNerdTalk._id },
    });

    if (communityIdObject) {
      // Update Community model
      await Community.findByIdAndUpdate(communityIdObject, {
        $push: { nerdtalks: createdNerdTalk._id },
      });
    }

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to create NerdTalk: ${error.message}`);
  }
}

async function fetchAllChildNerdTalks(nerdtalkId: string): Promise<any[]> {
  const childNerdTalks = await NerdTalk.find({ parentId: nerdtalkId });

  const descendantNerdTalks = [];
  for (const childNerdTalk of childNerdTalks) {
    const descendants = await fetchAllChildNerdTalks(childNerdTalk._id);
    descendantNerdTalks.push(childNerdTalk, ...descendants);
  }

  return descendantNerdTalks;
}

export async function deleteNerdTalk(id: string, path: string): Promise<void> {
  try {
    connectToDB();

    // Find the NerdTalk to be deleted (the main NerdTalk)
    const mainNerdTalk = await NerdTalk.findById(id).populate("author community");

    if (!mainNerdTalk) {
      throw new Error("NerdTalk not found");
    }

    // Fetch all child NerdTalks and their descendants recursively
    const descendantNerdTalks = await fetchAllChildNerdTalks(id);

    // Get all descendant NerdTalk IDs including the main NerdTalk ID and child NerdTalk IDs
    const descendantNerdTalkIds = [
      id,
      ...descendantNerdTalks.map((nerdtalk) => nerdtalk._id),
    ];

    // Extract the authorIds and communityIds to update User and Community models respectively
    const uniqueAuthorIds = new Set(
      [
        ...descendantNerdTalks.map((nerdtalk) => nerdtalk.author?._id?.toString()), // Use optional chaining to handle possible undefined values
        mainNerdTalk.author?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    const uniqueCommunityIds = new Set(
      [
        ...descendantNerdTalks.map((nerdtalk) => nerdtalk.community?._id?.toString()), // Use optional chaining to handle possible undefined values
        mainNerdTalk.community?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    // Recursively delete child NerdTalks and their descendants
    await NerdTalk.deleteMany({ _id: { $in: descendantNerdTalkIds } });

    // Update User model
    await User.updateMany(
      { _id: { $in: Array.from(uniqueAuthorIds) } },
      { $pull: { nerdtalks: { $in: descendantNerdTalkIds } } }
    );

    // Update Community model
    await Community.updateMany(
      { _id: { $in: Array.from(uniqueCommunityIds) } },
      { $pull: { nerdtalks: { $in: descendantNerdTalkIds } } }
    );

    revalidatePath(path);
  } catch (error: any) {
    throw a Error(`Failed to delete NerdTalk: ${error.message}`);
  }
}

export async function fetchNerdTalkById(nerdtalkId: string) {
  connectToDB();

  try {
    const nerdtalk = await NerdTalk.findById(nerdtalkId)
      .populate({
        path: "author",
        model: User,
        select: "_id id name image",
      }) // Populate the author field with _id and username
      .populate({
        path: "community",
        model: Community,
        select: "_id id name image",
      }) // Populate the community field with _id and name
      .populate({
        path: "children", // Populate the children field
        populate: [
          {
            path: "author", // Populate the author field within children
            model: User,
            select: "_id id name parentId image", // Select only _id and username fields of the author
          },
          {
            path: "children", // Populate the children field within children
            model: NerdTalk, // The model of the nested children (assuming it's the same "NerdTalk" model)
            populate: {
              path: "author", // Populate the author field within nested children
              model: User,
              select: "_id id name parentId image", // Select only _id and username fields of the author
            },
          },
        ],
      })
      .exec();

    return nerdtalk;
  } catch (err) {
    console.error("Error while fetching NerdTalk:", err);
    throw new Error("Unable to fetch NerdTalk");
  }
}

export async function addCommentToNerdTalk(
  nerdtalkId: string,
  commentText: string,
  userId: string,
  path: string
) {
  connectToDB();

  try {
    // Find the original NerdTalk by its ID
    const originalNerdTalk = await NerdTalk.findById(nerdtalkId);

    if (!originalNerdTalk) {
      throw new Error("NerdTalk not found");
    }

    // Create the new comment NerdTalk
    const commentNerdTalk = new NerdTalk({
      text: commentText,
      author: userId,
      parentId: nerdtalkId, // Set the parentId to the original NerdTalk's ID
    });

    // Save the comment NerdTalk to the database
    const savedCommentNerdTalk = await commentNerdTalk.save();

    // Add the comment NerdTalk's ID to the original NerdTalk's children array
    originalNerdTalk.children.push(savedCommentNerdTalk._id);

    // Save the updated original NerdTalk to the database
    await originalNerdTalk.save();

    revalidatePath(path);
  } catch (err) {
    console.error("Error while adding comment:", err);
    throw new Error("Unable to add comment");
  }
}
