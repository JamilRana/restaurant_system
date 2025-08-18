// server.ts

import { server } from "@/app/server/socket";

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => { 
  console.log(`Socket.IO server running on port ${PORT}`);
});