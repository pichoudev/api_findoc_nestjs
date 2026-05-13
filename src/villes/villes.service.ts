import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateVilleDto } from './dto/create.dto';
import { UpdateVilleDto } from './dto/update.dto';

@Injectable()
export class VillesService {

    // constructor
    constructor(
        private readonly prisma : PrismaService
    ){}

    // fonction pour creer une nouvelle ville
    async createVille(data:CreateVilleDto){
        // verifions que la ville n'existe pas d'abord dans la bd
        const isExist = await this.prisma.ville.findMany({
            where :{
                nom: data.nom
            }
        });

        if(isExist){
            return new NotFoundException("La ville existe deja dans la bd");
        }

        // creation
        const ville = await this.prisma.ville.create({
            data
        })

        return {
            message:"ville cree avec succes",
            data:ville
        }

    }

        // fonction pour recupere toutes les villes
        async getAllVille(){
            const villes = await this.prisma.ville.findMany();
            return villes;
        }


        // fonction pour recuperer une ville unique 
        async getByIdville(id:string){
            // verifie si une ville existe 
            const ville = await this.prisma.ville.findUnique({
                where:{
                    id:id
                }
            });

            if(!ville){
                return new NotFoundException("Ville n'existe pas dans la base de donnee");
            }

            // return la ville unique
            return ville;
        }


        // fonction pour supprimer une ville precis
        async deleteVille(id:string){
            // verifie si une ville existe 
            const ville = await this.prisma.ville.findUnique({
                where:{
                    id:id
                }
            });

            if(!ville){
                return new NotFoundException("Ville n'existe pas dans la base de donnee");
            }

            const villeDelete = await this.prisma.ville.delete({
                where:{
                    id:id
                }
            })

            return {
                message:"ville supprimee avec succes",
                villeDelete
            }
        }

        // fonction pour mettre une ville 
        async updateVille(id:string , data:UpdateVilleDto){
            // verifie si une ville existe 
            const ville = await this.prisma.ville.findUnique({
                where:{
                    id:id
                }
            });

            if(!ville){
                return new NotFoundException("Ville n'existe pas dans la base de donnee");
            }

            // mettre a jour la ville
            const villeUpdate = await this.prisma.ville.update({
                where:{
                    id:id
                },
                data:data
            })

            return {
            message: "ville mis à jour avec succès",
            data: villeUpdate
        };
        }
}
