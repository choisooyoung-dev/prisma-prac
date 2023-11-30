import { PrismaClient } from '@prisma/client';

// PrismaClient 인스턴스 생성
export const prisma = new PrismaClient({
    // prisma 이용해 데이터베이스 접근 시, SQL 출력해준다.
    log: ['query', 'info', 'warn', 'error'],

    // 에러메세지를 평문이 아닌, 개발자가 읽기 쉬운 형태로 출력해준다.
    errorFormat: 'pretty',
});
