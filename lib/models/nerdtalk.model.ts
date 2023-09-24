import mongoose from "mongoose";

const nerdTalkSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Community",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  parentId: {
    type: String,
  },
  children: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NerdTalk",
    },
  ],
});

const NerdTalk = mongoose.models.NerdTalk || mongoose.model("NerdTalk", nerdTalkSchema);

export default NerdTalk;
