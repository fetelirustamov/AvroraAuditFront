export interface FirmDto {
    id: number;
    name: string;
    description?: string;
    /** Backend Firm.Address sahəsi (bax: FirmRepository.AddAsync — SQL parametri "@Adress" kimi yazılıb,
     *  bu, C#-dakı "Address" xassəsi ilə uyğun gəlmir. Firma yaratma bu səbəbdən backend-də xəta verə bilər —
     *  bax AvroraAuditApi/Infrastructure/Audit.Persistence/Repositories/FirmRepository.cs. Frontend tərəfi düzgündür,
     *  problem backend-dədir və backend komandası tərəfindən düzəldilməlidir. */
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}
