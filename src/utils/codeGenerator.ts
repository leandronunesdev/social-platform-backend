import bcrypt from "bcrypt";
import crypto from "node:crypto";

const generate6DigitCode = () => {
  const code = crypto.randomInt(0, 1_000_000);
  return code.toString().padStart(6, "0");
};

const hash = (code: string): Promise<string> => bcrypt.hash(code, 10);

export const codeGenerator = { generate6DigitCode, hash };
