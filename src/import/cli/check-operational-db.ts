import { checkOperationalDatabaseReadiness } from "@/infrastructure/db/readiness";
import { prisma } from "@/infrastructure/db/prisma";

async function main() {
  const readiness = await checkOperationalDatabaseReadiness();

  if (readiness.ok) {
    console.log("Operational DB is ready.");
    return;
  }

  console.error(`Operational DB is not ready: ${readiness.code}`);
  console.error(readiness.message);
  console.error(readiness.action);

  if (readiness.details) {
    console.error(readiness.details);
  }

  process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
