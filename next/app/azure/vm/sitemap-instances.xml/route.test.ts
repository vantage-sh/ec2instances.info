import { GET } from "./route";
import instanceIds from "@/public/azure-instance-ids.json";
import nextSitemapTest from "@/utils/testing/nextSitemapTest";

const paths = instanceIds.map((id) => `/azure/vm/${id}`);

nextSitemapTest(GET, paths);
