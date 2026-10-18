import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException } from '@nestjs/common';

import { rejectRequest } from '@common/utils/reject-request';

@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
    constructor(private readonly stealthMode: boolean) {}

    catch(exception: NotFoundException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();

        rejectRequest(response, this.stealthMode, 404, 'Not found');
    }
}
