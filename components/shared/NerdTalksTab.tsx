import { redirect } from "next/navigation";
import { fetchCommunityPosts } from "@/lib/actions/community.actions";
import { fetchUserPosts } from "@/lib/actions/user.actions";
import NerdTalkCard from "../cards/NerdTalkCard";

interface Result {
  name: string;
  image: string;
  id: string;
  nerdTalks: {
    _id: string;
    text: string;
    parentId: string | null;
    author: {
      name: string;
      image: string;
      id: string;
    };
    community: {
      id: string;
      name: string;
      image: string;
    } | null;
    createdAt: string;
    children: {
      author: {
        image: string;
      };
    }[];
  }[];
}

interface Props {
  currentUserId: string;
  accountId: string;
  accountType: string;
}

async function NerdTalksTab({ currentUserId, accountId, accountType }: Props) {
  try {
    let result: Result;

    if (accountType === "Community") {
      result = await fetchCommunityPosts(accountId);
    } else {
      result = await fetchUserPosts(accountId);
    }

    if (!result) {
      // Handle the case where the result is undefined or falsy
      redirect("/");
      return null; // Return early to avoid further rendering
    }

    return (
      <section className="mt-9 flex flex-col gap-10">
        {result.nerdTalks.map((nerdTalk) => (
          <NerdTalkCard
            key={nerdTalk._id}
            id={nerdTalk._id}
            currentUserId={currentUserId}
            parentId={nerdTalk.parentId}
            content={nerdTalk.text}
            author={
              accountType === "User"
                ? { name: result.name, image: result.image, id: result.id }
                : {
                    name: nerdTalk.author.name,
                    image: nerdTalk.author.image,
                    id: nerdTalk.author.id,
                  }
            }
            community={
              accountType === "Community"
                ? { name: result.name, id: result.id, image: result.image }
                : nerdTalk.community
            }
            createdAt={nerdTalk.createdAt}
            comments={nerdTalk.children}
          />
        ))}
      </section>
    );
  } catch (error) {
    // Handle any other errors that might occur during data fetching
    console.error("Error fetching data:", error);
    // You can add additional error handling or UI feedback here if needed
    return null; // Return early to avoid rendering in case of an error
  }
}

export default NerdTalksTab;
